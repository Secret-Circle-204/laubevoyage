import { CustomerWorkflowEngine } from './workflow'
import { CustomerRepository } from './repositories/customer-repository'
import type { CustomerAggregate } from './aggregate'
import type { CompanionTravelerEntity, CustomerAddressEntity, DeviceSessionEntity } from './types'
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
    options?: { eventSource?: 'domain' | 'external' },
  ): Promise<CustomerAggregate> {
    return this.workflowEngine.executeRegisterWorkflow(email, firstName, lastName, password, options)
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

  async verifyEmail(customerId: number, rawToken: string): Promise<CustomerAggregate> {
    return this.workflowEngine.executeVerifyEmailWorkflow(customerId, rawToken)
  }

  async login(email: string): Promise<CustomerAggregate> {
    return this.workflowEngine.identity.login(email)
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

  async addTraveler(traveler: Omit<CompanionTravelerEntity, 'travelerId'>): Promise<CompanionTravelerEntity> {
    return this.workflowEngine.profileManager.addTraveler(traveler)
  }

  async getAddresses(customerId: number): Promise<CustomerAddressEntity[]> {
    return this.workflowEngine.profileManager.getAddresses(customerId)
  }

  async addAddress(address: Omit<CustomerAddressEntity, 'addressId'>): Promise<CustomerAddressEntity> {
    return this.workflowEngine.profileManager.addAddress(address)
  }

  async getActiveDeviceSessions(customerId: number): Promise<DeviceSessionEntity[]> {
    return this.workflowEngine.sessionManager.getActiveSessions(customerId)
  }
}
