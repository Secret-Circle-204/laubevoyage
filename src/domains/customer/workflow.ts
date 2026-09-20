import type { Payload } from 'payload'
import type { RequestContext } from '@/types'
import { CustomerRepository } from './repositories/customer-repository'
import { TravelerRepository } from './repositories/traveler-repository'
import { IdentityCoordinatorFacade } from './identity/identity-facade'
import { ProfileManager } from './profile-manager'
import { PreferencesManager } from './preferences-manager'
import { GDPRConsentManager } from './gdpr-consent'
import { CustomerQueries } from './queries'
import { EventOutboxService } from '../events/outbox'
import type { CustomerAggregate } from './aggregate'
import type { CustomerPreferencesInput } from './types'
import { NotificationService } from '../notification/service'

export type VerificationResult =
  | { status: 'VERIFIED'; customer: CustomerAggregate }
  | { status: 'ALREADY_VERIFIED'; customer: CustomerAggregate }
  | { status: 'INVALID_TOKEN'; error: string }

/**
 * Customer Workflow Engine
 * Central deterministic orchestrator for Customer & Identity workflows via Constructor Dependency Injection.
 * Symmetrical architecture with BookingWorkflowEngine, PaymentWorkflowEngine, LoyaltyWorkflowEngine, and ExperienceWorkflowEngine.
 */
export class CustomerWorkflowEngine {
  public repository: CustomerRepository
  public travelerRepository: TravelerRepository
  public identity: IdentityCoordinatorFacade
  public profileManager: ProfileManager
  public preferencesManager: PreferencesManager
  public gdprManager: GDPRConsentManager
  public queries: CustomerQueries
  public eventOutbox: EventOutboxService
  public notificationService: NotificationService

  constructor(repository: CustomerRepository | Payload) {
    let payloadInstance: Payload
    if (repository && 'getPayload' in repository) {
      this.repository = repository as CustomerRepository
      payloadInstance = this.repository.getPayload()
    } else {
      payloadInstance = repository as Payload
      this.repository = new CustomerRepository(payloadInstance)
    }

    this.travelerRepository = new TravelerRepository(payloadInstance)
    this.identity = new IdentityCoordinatorFacade(this.repository)
    this.profileManager = new ProfileManager(this.travelerRepository)
    this.preferencesManager = new PreferencesManager()
    this.gdprManager = new GDPRConsentManager(this.repository)
    this.queries = new CustomerQueries(this.repository)
    this.eventOutbox = EventOutboxService.getInstance()
    this.notificationService = new NotificationService(payloadInstance)
  }

  /**
   * Register customer workflow.
   */
  async executeRegisterWorkflow(
    email: string,
    firstName: string,
    lastName: string,
    phone: string,
    password?: string,
    preferences?: CustomerPreferencesInput,
    options?: { eventSource?: 'domain' | 'external' },
    context?: RequestContext,
  ): Promise<CustomerAggregate> {
    const transactionID = context?.transactionId || await this.repository.getPayload().db.beginTransaction()
    const activeContext: RequestContext = context || { transactionId: transactionID }
    console.log(`[CustomerWorkflowEngine.executeRegisterWorkflow] Beginning customer registration flow for ${email}. Nested Transaction:`, !!context, `| TransactionID:`, transactionID)

    try {
      const customer = await this.identity.registerCustomer(
        email,
        firstName,
        lastName,
        phone,
        password,
        preferences,
        options,
        activeContext,
      )

      // Transactionally enqueue Email #1: Security Verification (Zero raw token in persistent payload)
      await this.notificationService.enqueueNotification(
        {
          referenceType: 'VERIFICATION',
          referenceId: String(customer.customerId),
          customerId: customer.customerId,
          recipient: customer.email,
          channel: 'email',
          category: 'security',
          priority: 'critical',
          templateId: 'verification_email',
          translationKey: 'customer.verify_email',
          templateData: { name: customer.fullName, customerId: customer.customerId },
        },
        activeContext,
      )

      await this.eventOutbox.recordAndPublish({
        type: 'CUSTOMER_REGISTERED',
        eventVersion: 1,
        customerId: customer.customerId,
        email: customer.email,
        fullName: customer.fullName,
        status: customer.status,
        timestamp: new Date().toISOString(),
      }, activeContext)

      if (!context && transactionID) {
        console.log(`[CustomerWorkflowEngine.executeRegisterWorkflow] Committing database transaction: ${transactionID}`)
        await this.repository.getPayload().db.commitTransaction(transactionID)
      }

      console.log(`[CustomerWorkflowEngine.executeRegisterWorkflow] Customer registered successfully. ID: ${customer.customerId}, Email: ${customer.email}`)
      return customer
    } catch (err) {
      console.error('[CustomerWorkflowEngine.executeRegisterWorkflow] Registration failed. Rolling back transaction. Error:', err)
      if (!context && transactionID) {
        console.log(`[CustomerWorkflowEngine.executeRegisterWorkflow] Triggered ROLLBACK for transaction: ${transactionID}`)
        await this.repository.getPayload().db.rollbackTransaction(transactionID)
      }
      throw err
    }
  }

  /**
   * Verify email workflow. Emits EmailVerifiedEvent which triggers welcome bonus in Loyalty domain.
   */
  async executeVerifyEmailWorkflow(rawToken: string, email?: string): Promise<VerificationResult> {
    try {
      let customerId: number | null = null

      // 1. Locate the customer ID prior to verification
      if (email) {
        customerId = await this.repository.findCustomerIdByEmail(email)
      } else {
        customerId = await this.repository.findCustomerIdByVerificationToken(rawToken)
      }

      if (customerId === null) {
        return {
          status: 'INVALID_TOKEN',
          error: 'Verification token is invalid or expired.',
        }
      }

      // Load initial state to check if already verified
      const initialCustomer = await this.repository.findById(customerId)
      if (initialCustomer.isEmailVerified && initialCustomer.status === 'active') {
        return { status: 'ALREADY_VERIFIED', customer: initialCustomer }
      }

      // 2. Perform technical verification via official API
      await this.identity.verifyEmail(rawToken)

      // 3. Load fresh state post-verification
      let customer = await this.repository.findById(customerId)

      // 4. Apply state transition rules and idempotency guards
      if (customer.status === 'pending_verification') {
        customer.status = 'active'
        customer.emailVerifiedAt = new Date().toISOString()
        customer = await this.repository.save(customer)

        // 5. Publish verification event ONLY on real transition
        await this.eventOutbox.recordAndPublish({
          type: 'CUSTOMER_EMAIL_VERIFIED',
          eventVersion: 1,
          customerId: customer.customerId,
          email: customer.email,
          verifiedAt: customer.emailVerifiedAt || new Date().toISOString(),
          timestamp: new Date().toISOString(),
        })

        return { status: 'VERIFIED', customer }
      }

      return { status: 'ALREADY_VERIFIED', customer }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Email verification failed'
      return {
        status: 'INVALID_TOKEN',
        error: message,
      }
    }
  }
}
