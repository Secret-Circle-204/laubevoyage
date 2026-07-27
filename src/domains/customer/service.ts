import { CustomerWorkflowEngine, type VerificationResult } from './workflow'
import { CustomerRepository } from './repositories/customer-repository'
import type { CustomerAggregate } from './aggregate'
import type {
  CompanionTravelerEntity,
  CustomerAddressEntity,
  DeviceSessionEntity,
  CustomerPreferencesInput,
} from './types'
import { EventOutboxService } from '../events/outbox'

/**
 * Customer Domain Service (Enterprise Thin Facade)
 * Single entry point for all Customer & Identity operations via Dependency Injection.
 * Delegated to CustomerWorkflowEngine for single-responsibility orchestration.
 */
export class CustomerService {
  private repository: CustomerRepository
  private workflowEngine: CustomerWorkflowEngine

  constructor(repository: CustomerRepository) {
    this.repository = repository
    this.workflowEngine = new CustomerWorkflowEngine(repository)
  }

  async authenticateRequest(headers: Headers): Promise<{ id: number; email?: string } | null> {
    return this.repository.authenticateRequest(headers)
  }

  async registerCustomer(
    email: string,
    firstName: string,
    lastName: string,
    password?: string,
    preferences?: CustomerPreferencesInput,
    options?: { eventSource?: 'domain' | 'external' },
  ): Promise<CustomerAggregate> {
    return this.workflowEngine.executeRegisterWorkflow(
      email,
      firstName,
      lastName,
      password,
      preferences,
      options,
    )
  }

  async onCustomerCreated(customerId: number): Promise<void> {
    const customer = await this.getById(customerId)
    const outbox = EventOutboxService.getInstance()
    await outbox.recordAndPublish({
      type: 'CUSTOMER_REGISTERED',
      eventVersion: 'v1',
      customerId: customer.customerId,
      email: customer.email,
      fullName: customer.fullName,
      status: customer.status,
      timestamp: new Date().toISOString(),
    })
  }

  async findByEmail(email: string): Promise<CustomerAggregate | null> {
    return this.repository.findByEmail(email)
  }

  async verifyEmail(rawToken: string, email?: string): Promise<VerificationResult> {
    return this.workflowEngine.executeVerifyEmailWorkflow(rawToken, email)
  }

  async login(email: string): Promise<CustomerAggregate> {
    return this.workflowEngine.identity.login(email)
  }

  async loginWithPassword(
    email: string,
    password?: string,
  ): Promise<{ user: CustomerAggregate; token: string } | null> {
    return this.repository.login(email, password)
  }

  async onCustomerAuthenticated(customerId: number): Promise<CustomerAggregate> {
    return this.workflowEngine.identity.onCustomerAuthenticated(customerId)
  }

  async getById(customerId: number): Promise<CustomerAggregate> {
    return this.workflowEngine.queries.getById(customerId)
  }

  async getProfile(customerId: number): Promise<CustomerAggregate> {
    return this.getById(customerId)
  }

  async getTravelers(customerId: number): Promise<CompanionTravelerEntity[]> {
    return this.workflowEngine.profileManager.getTravelers(customerId)
  }

  async addTraveler(
    traveler: Omit<CompanionTravelerEntity, 'travelerId'>,
  ): Promise<CompanionTravelerEntity> {
    return this.workflowEngine.profileManager.addTraveler(traveler)
  }

  async getAddresses(customerId: number): Promise<CustomerAddressEntity[]> {
    return this.workflowEngine.profileManager.getAddresses(customerId)
  }

  async addAddress(
    address: Omit<CustomerAddressEntity, 'addressId'>,
  ): Promise<CustomerAddressEntity> {
    return this.workflowEngine.profileManager.addAddress(address)
  }

  async getActiveDeviceSessions(customerId: number): Promise<DeviceSessionEntity[]> {
    return this.workflowEngine.sessionManager.getActiveSessions(customerId)
  }

  async handleFailedLogin(email: string): Promise<void> {
    await this.workflowEngine.identity.handleFailedLogin(email)
  }

  async updateLoyaltyProfile(
    customerId: number,
    loyaltyData: { tier?: string; points?: number; totalSpent?: number; tierAchievedAt?: string },
  ): Promise<void> {
    await this.repository.updateLoyaltyProfile(customerId, loyaltyData)
  }
}
