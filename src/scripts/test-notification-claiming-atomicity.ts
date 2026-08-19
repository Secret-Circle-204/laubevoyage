import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../payload.config'
import { NotificationRepository } from '../domains/notification/repository'

async function runTest() {
  console.log('[TestNotificationClaimingAtomicity] Starting Concurrency Claiming Test...')

  const payload = await getPayload({ config })
  const repository = new NotificationRepository(payload)

  const testJobId = `test_claim_atomicity_${Date.now()}`

  // 1. Create a notification job with attempts = 2 and status = 'failed'
  console.log(`[TestNotificationClaimingAtomicity] Creating test notification job ${testJobId} with attempts=2, status='failed'`)
  await repository.saveJob({
    jobId: testJobId,
    recipient: 'test@example.com',
    channel: 'email',
    category: 'booking',
    priority: 'normal',
    templateId: 'test-template',
    translationKey: '',
    templateData: { name: 'Test User' },
    referenceType: 'booking',
    referenceId: 'test_ref_123',
    status: 'failed',
    attempts: 2,
    maxAttempts: 3,
    createdAt: new Date().toISOString(),
  })

  // Verify initial state
  const initialJob = await repository.getJobById(testJobId)
  if (!initialJob) {
    throw new Error('[TestNotificationClaimingAtomicity] Failed to find created test job.')
  }
  console.log(`[TestNotificationClaimingAtomicity] Initial Job status: ${initialJob.status}, attempts: ${initialJob.attempts}`)

  if (initialJob.status !== 'failed' || initialJob.attempts !== 2) {
    throw new Error(`[TestNotificationClaimingAtomicity] Setup state mismatch. Expected status failed and attempts 2, got ${initialJob.status} and ${initialJob.attempts}`)
  }

  // 2. Launch 10 concurrent claim requests in parallel representing 10 different worker replicas
  console.log('[TestNotificationClaimingAtomicity] Spawning 10 concurrent claiming workers in parallel...')
  const claimPromises = Array.from({ length: 10 }).map((_, index) => {
    const workerId = `replica_worker_${index}`
    return repository.claimJob(testJobId, workerId)
  })

  const results = await Promise.all(claimPromises)

  // 3. Analyze claims results
  const successfulClaims = results.filter((res) => res === true).length
  const failedClaims = results.filter((res) => res === false).length

  console.log(`[TestNotificationClaimingAtomicity] Successful claims count: ${successfulClaims} (expected: 1)`)
  console.log(`[TestNotificationClaimingAtomicity] Failed claims count: ${failedClaims} (expected: 9)`)

  // 4. Fetch the final database state
  const finalJob = await repository.getJobById(testJobId)
  if (!finalJob) {
    throw new Error('[TestNotificationClaimingAtomicity] Failed to find final test job.')
  }
  console.log(`[TestNotificationClaimingAtomicity] Final Job status: ${finalJob.status}, attempts: ${finalJob.attempts}`)

  // 5. Assertions
  let testFailed = false
  if (successfulClaims !== 1) {
    console.error(`[Assertion Failure] Expected exactly 1 successful claim, got ${successfulClaims}`)
    testFailed = true
  }
  if (failedClaims !== 9) {
    console.error(`[Assertion Failure] Expected exactly 9 failed claims, got ${failedClaims}`)
    testFailed = true
  }
  if (finalJob.status !== 'processing') {
    console.error(`[Assertion Failure] Expected final job status to be 'processing', got '${finalJob.status}'`)
    testFailed = true
  }
  if (finalJob.attempts !== 3) {
    console.error(`[Assertion Failure] Expected final job attempts to be N+1 (3), got ${finalJob.attempts}`)
    testFailed = true
  }

  // 6. Cleanup
  console.log('[TestNotificationClaimingAtomicity] Cleaning up test database record...')
  const deleteResult = await payload.delete({
    collection: 'notification-logs',
    where: {
      notificationId: { equals: testJobId },
    },
  })
  console.log(`[TestNotificationClaimingAtomicity] Cleaned up ${deleteResult.errors.length === 0 ? 'successfully' : 'with errors'}`)

  if (testFailed) {
    console.error('[TestNotificationClaimingAtomicity] ❌ TEST FAILED!')
    process.exit(1)
  } else {
    console.log('[TestNotificationClaimingAtomicity] ✅ CONCURRENCY CLAIMING TEST PASSED!')
    process.exit(0)
  }
}

runTest().catch((err) => {
  console.error('[TestNotificationClaimingAtomicity] Crash during test:', err)
  process.exit(1)
})
