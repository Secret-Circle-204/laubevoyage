import type { Payload } from 'payload'
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

/**
 * Customer Workflow Engine
 * Central deterministic orchestrator for Customer & Identity workflows.
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
  private eventOutbox: EventOutboxService

  constructor(repository?: CustomerRepository | Payload, payload?: Payload) {
    if (repository && 'findByEmail' in repository) {
      this.repository = repository as CustomerRepository
    } else {
      this.repository = new CustomerRepository(repository as Payload)
    }
    const activePayload = payload || (repository && 'find' in repository ? (repository as Payload) : undefined)
    this.travelerRepository = new TravelerRepository(activePayload as Payload)
    this.addressRepository = new AddressRepository(activePayload as Payload)
    this.sessionRepository = new DeviceSessionRepository(activePayload as Payload)

    this.identity = new IdentityCoordinatorFacade(activePayload as Payload, this.repository)
    this.profileManager = new ProfileManager(this.travelerRepository, this.addressRepository)
    this.preferencesManager = new PreferencesManager()
    this.gdprManager = new GDPRConsentManager(this.repository)
    this.sessionManager = new DeviceSessionManager(this.sessionRepository)
    this.queries = new CustomerQueries(this.repository)
    this.eventOutbox = EventOutboxService.getInstance()
  }

  /**
   * Register customer workflow.
   */
  async executeRegisterWorkflow(email: string, firstName: string, lastName: string): Promise<CustomerAggregate> {
    const customer = await this.identity.registerCustomer(email, firstName, lastName)

    await this.eventOutbox.recordAndPublish({
      type: 'CUSTOMER_REGISTERED',
      eventVersion: 'v1',
      customerId: customer.customerId,
      email: customer.email,
      fullName: customer.fullName,
      status: customer.status,
      timestamp: new Date().toISOString(),
    })

    return customer
  }

  /**
   * Verify email workflow. Emits EmailVerifiedEvent which triggers welcome bonus in Loyalty domain.
   */
  async executeVerifyEmailWorkflow(customerId: number, rawToken: string): Promise<CustomerAggregate> {
    const customer = await this.identity.verifyEmail(customerId, rawToken)

    await this.eventOutbox.recordAndPublish({
      type: 'CUSTOMER_EMAIL_VERIFIED',
      eventVersion: 'v1',
      customerId: customer.customerId,
      email: customer.email,
      verifiedAt: new Date().toISOString(),
      timestamp: new Date().toISOString(),
    })

    return customer
  }
}
