import type { NotificationQueue } from './queue'
import type { NotificationDispatcher } from './dispatcher'
import type { NotificationRepository } from './repository'
import type { NotificationJobEntity } from './types'
import { NotificationPolicy, NotificationRetryScheduler } from './policy'
import { MaintenanceLeaseService } from '../maintenance/lease-service'

/**
 * Background Notification Worker Engine
 * Asynchronously processes queued notification jobs with retries, DB crash recovery, and DLQ routing.
 */
export class NotificationWorker {
  private queue: NotificationQueue
  private dispatcher: NotificationDispatcher
  private repository: NotificationRepository
  private isRecovering = false
  private isProcessing = false
  private workerId = `worker_${process.pid || 'main'}_${Math.random().toString(36).substring(2, 7)}`

  constructor(queue: NotificationQueue, dispatcher: NotificationDispatcher, repository: NotificationRepository) {
    this.queue = queue
    this.dispatcher = dispatcher
    this.repository = repository
  }

  async recoverJobsFromDatabase(): Promise<number> {
    if (this.isRecovering) return 0
    this.isRecovering = true
    try {
      // 1. Atomically reap orphaned/stale processing jobs whose lease expired
      await this.repository.reapStaleProcessingJobs(50)

      // 2. Fetch eligible queued and retry-ready failed jobs
      const recoverableJobs = await this.repository.findRecoverableJobs(50)
      for (const job of recoverableJobs) {
        this.queue.enqueue(job)
      }
      return recoverableJobs.length
    } finally {
      this.isRecovering = false
    }
  }

  async processNextJob(): Promise<boolean> {
    if (this.isProcessing) return false
    this.isProcessing = true
    try {
      let job = this.queue.dequeue()
      if (!job) {
        // DB-backed recovery: Pull unfulfilled/orphaned jobs from notification-logs
        const recoveredCount = await this.recoverJobsFromDatabase()
        if (recoveredCount > 0) {
          console.log(`[NotificationWorker] Recovered ${recoveredCount} jobs from database queue.`);
          job = this.queue.dequeue()
        }
      }
      if (!job) return false

      const payload = this.repository.payloadInstance
      if (!payload) {
        console.warn('[NotificationWorker] Cannot process job without initialized Payload instance.')
        return false
      }

    // 1. Acquire distributed process-independent lease for this specific job ID
    const acquired = await MaintenanceLeaseService.acquireLease(payload, `notification_job_${job.jobId}`, this.workerId, 60000) // 1 minute lease
    if (!acquired) {
      console.log(`[NotificationWorker] Lease acquisition skipped for job ${job.jobId} (already processing by another replica).`)
      return false
    }

    try {
      // 2. Atomic state claim: Transition status to processing and increment attempts atomically
      const claimed = await this.repository.claimJob(job.jobId, this.workerId)
      if (!claimed) {
        console.log(`[NotificationWorker] Atomic Claim failed for job ${job.jobId} (already claimed or terminal state).`)
        return false
      }

      // 3. Current-state verification: Fetch authoritative state to confirm eligibility
      const freshJob = await this.repository.getJobById(job.jobId)
      if (!freshJob) {
        return false
      }

      if (freshJob.status === 'sent' || freshJob.status === 'delivered' || freshJob.status === 'dlq') {
        console.log(`[NotificationWorker] Verification Guard: Job ${job.jobId} is already in terminal state: ${freshJob.status}. Skipping dispatch.`)
        return false
      }

      console.log(`[NotificationWorker] ✉️ Processing job ${freshJob.jobId} (Template: ${freshJob.templateId}, Recipient: ${freshJob.recipient}, Attempt: ${freshJob.attempts}/${freshJob.maxAttempts})`);

      // 4. Validate policy on fresh job state
      const policyResult = NotificationPolicy.canDispatch(freshJob)
      if (!policyResult.allowed) {
        console.warn(`[NotificationWorker] ⚠️ Job ${freshJob.jobId} dispatch rejected by policy: ${policyResult.reason}`);
        freshJob.status = (freshJob.attempts >= freshJob.maxAttempts || policyResult.code === 'MISSING_RECIPIENT') ? 'dlq' : 'failed'
        freshJob.lastError = policyResult.reason
        if (freshJob.status === 'dlq') {
          freshJob.nextAttemptAt = undefined
        }
        await this.repository.saveJob(freshJob)
        return false
      }

      // 4.1 JIT Verification Credential Preparation (Delegating to CustomerPolicy)
      let dispatchJob: NotificationJobEntity = freshJob
      const targetCustomerId = freshJob.customerId || (freshJob.referenceId ? Number(freshJob.referenceId) : undefined)
      if (freshJob.templateId === 'verification_email' && targetCustomerId && !isNaN(targetCustomerId)) {
        const { CustomerRepository } = await import('../customer/repositories/customer-repository')
        const { CustomerPolicy } = await import('../customer/policy')
        const customerRepo = new CustomerRepository(payload)
        const { customer, rawToken, expiresAt } = await customerRepo.getVerificationDispatchData(targetCustomerId)

        const isExpired = expiresAt ? new Date(expiresAt).getTime() < Date.now() : false
        const verificationPolicy = CustomerPolicy.canDispatchVerification(customer, {
          hasToken: !!rawToken,
          isExpired,
        })

        if (!verificationPolicy.allowed) {
          if (verificationPolicy.code === 'ALREADY_VERIFIED' || verificationPolicy.code === 'TOKEN_CONSUMED') {
            console.log(`[NotificationWorker] Customer #${targetCustomerId} already verified or token consumed. Marking job as sent.`);
            freshJob.status = 'sent'
            freshJob.sentAt = new Date().toISOString()
            await this.repository.saveJob(freshJob)
            return true
          }

          console.log(`[NotificationWorker] Verification dispatch rejected for customer #${freshJob.customerId}: ${verificationPolicy.reason}`);
          freshJob.status = 'failed'
          freshJob.lastError = verificationPolicy.reason
          await this.repository.saveJob(freshJob)
          return false
        }

        const serverURL = process.env.NEXT_PUBLIC_SERVER_URL
        if (!serverURL) {
          throw new Error('[NotificationWorker] NEXT_PUBLIC_SERVER_URL is missing in environment. Cannot generate verification link.')
        }

        // Render verify URL transiently in-memory (never persisted to notification-logs)
        dispatchJob = {
          ...freshJob,
          templateData: {
            ...freshJob.templateData,
            verificationUrl: `${serverURL.replace(/\/$/, '')}/verify-email?token=${rawToken}&email=${encodeURIComponent(freshJob.recipient)}`,
          },
        }
      }

      try {
        const result = await this.dispatcher.dispatch(dispatchJob)

        if (result.success) {
          console.log(`[NotificationWorker] ✅ Job ${freshJob.jobId} successfully delivered to ${freshJob.recipient}.`);
          freshJob.status = 'delivered'
          freshJob.sentAt = new Date().toISOString()
        } else {
          console.error(`[NotificationWorker] ❌ Job ${freshJob.jobId} dispatch failed: ${result.error || 'Unknown error'}`);
          const delaySeconds = NotificationRetryScheduler.calculateNextAttemptDelay(freshJob.channel, freshJob.attempts)
          if (delaySeconds === null) {
            console.error(`[NotificationWorker] 🚨 Job ${freshJob.jobId} exceeded max attempts. Routing to DLQ.`);
            freshJob.status = 'dlq'
            freshJob.lastError = result.error || 'Max retries reached'
            freshJob.nextAttemptAt = undefined
          } else {
            freshJob.status = 'failed'
            freshJob.lastError = result.error
            freshJob.nextAttemptAt = new Date(Date.now() + delaySeconds * 1000).toISOString()
          }
        }
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err)
        console.error(`[NotificationWorker] ❌ Exception during job ${freshJob.jobId} execution: ${errMsg}`);
        const delaySeconds = NotificationRetryScheduler.calculateNextAttemptDelay(freshJob.channel, freshJob.attempts)

        if (delaySeconds === null) {
          freshJob.status = 'dlq'
          freshJob.lastError = errMsg
          freshJob.nextAttemptAt = undefined
        } else {
          freshJob.status = 'failed'
          freshJob.lastError = errMsg
          freshJob.nextAttemptAt = new Date(Date.now() + delaySeconds * 1000).toISOString()
        }
      }

      await this.repository.saveJob(freshJob)
      return freshJob.status === 'delivered'
    } finally {
      // 5. Release distributed lease for this job
      try {
        await MaintenanceLeaseService.releaseLease(payload, `notification_job_${job.jobId}`, this.workerId)
      } catch (releaseErr) {
        console.error(`[NotificationWorker] Failed to release lease for job ${job.jobId}:`, releaseErr)
      }
    }
    } finally {
      this.isProcessing = false
    }
  }
}
