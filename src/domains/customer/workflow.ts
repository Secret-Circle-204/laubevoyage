import type { Payload } from 'payload'
import type { RequestContext } from '@/types'
import { CustomerRepository } from './repositories/customer-repository'
import { TravelerRepository } from './repositories/traveler-repository'
import { AddressRepository } from './repositories/address-repository'
import { DeviceSessionRepository } from './repositories/session-repository'
import { IdentityCoordinatorFacade } from './identity/identity-facade'
import { ProfileManager } from './profile-manager'
import { PreferencesManager } from './preferences-manager'
import { GDPRConsentManager } from './gdpr-consent'
import { DeviceSessionManager } from './device-sessions'
import { CustomerQueries } from './queries'
import { EventOutboxService } from '../events/outbox'
import type { CustomerAggregate } from './aggregate'
import type { CustomerPreferencesInput } from './types'

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
  public addressRepository: AddressRepository
  public sessionRepository: DeviceSessionRepository
  public identity: IdentityCoordinatorFacade
  public profileManager: ProfileManager
  public preferencesManager: PreferencesManager
  public gdprManager: GDPRConsentManager
  public sessionManager: DeviceSessionManager
  public queries: CustomerQueries
  public eventOutbox: EventOutboxService

  constructor(repository: CustomerRepository | Payload) {
    let payloadInstance: Payload
    if (repository && 'findByEmail' in repository) {
      this.repository = repository
      payloadInstance = repository.getPayload()
    } else {
      this.repository = new CustomerRepository(repository as Payload)
      payloadInstance = repository as Payload
    }
    this.travelerRepository = new TravelerRepository(payloadInstance)
    this.addressRepository = new AddressRepository(payloadInstance)
    this.sessionRepository = new DeviceSessionRepository(payloadInstance)
    this.identity = new IdentityCoordinatorFacade(this.repository)
    this.profileManager = new ProfileManager(this.travelerRepository, this.addressRepository)
    this.preferencesManager = new PreferencesManager()
    this.gdprManager = new GDPRConsentManager(this.repository)
    this.sessionManager = new DeviceSessionManager(this.sessionRepository)
    this.queries = new CustomerQueries(this.repository, this.sessionRepository)
    this.eventOutbox = EventOutboxService.getInstance()
  }

  /**
   * Register customer workflow.
   */
  async executeRegisterWorkflow(
    email: string,
    firstName: string,
    lastName: string,
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
        password,
        preferences,
        options,
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
