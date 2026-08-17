import type { RequestContext } from '@/types'
import { CustomerWorkflowEngine, type VerificationResult } from './workflow'
import { CustomerRepository } from './repositories/customer-repository'
import type { CustomerAggregate } from './aggregate'
import type { Customer } from '@/payload-types'
import {
  type CompanionTravelerEntity,
  type CustomerAddressEntity,
  type DeviceSessionEntity,
  type CustomerPreferencesInput,
  type CustomerDeletionDependencyChecker,
  CustomerDeletionNotAllowedException,
} from './types'
import { CustomerPolicy } from './policy'
import { EventOutboxService } from '../events/outbox'

/**
 * Customer Domain Service (Enterprise Thin Facade)
 * Single entry point for all Customer & Identity operations via Dependency Injection.
 * Delegated to CustomerWorkflowEngine for single-responsibility orchestration.
 */
export class CustomerService {
  private repository: CustomerRepository
  private dependencyChecker: CustomerDeletionDependencyChecker
  private workflowEngine: CustomerWorkflowEngine

  constructor(
    repository: CustomerRepository,
    dependencyChecker: CustomerDeletionDependencyChecker,
  ) {
    this.repository = repository
    this.dependencyChecker = dependencyChecker
    this.workflowEngine = new CustomerWorkflowEngine(repository)
  }

  mapPayloadUser(user: Customer): CustomerAggregate {
    return this.repository.mapPayloadUser(user)
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
    context?: RequestContext,
  ): Promise<CustomerAggregate> {
    return this.workflowEngine.executeRegisterWorkflow(
      email,
      firstName,
      lastName,
      password,
      preferences,
      options,
      context,
    )
  }

  async onCustomerCreated(customerId: number, context?: RequestContext): Promise<void> {
    const customer = await this.getById(customerId, context)
    const outbox = EventOutboxService.getInstance()
    await outbox.recordAndPublish({
      type: 'CUSTOMER_REGISTERED',
      eventVersion: 1,
      customerId: customer.customerId,
      email: customer.email,
      fullName: customer.fullName,
      status: customer.status,
      timestamp: new Date().toISOString(),
    }, context)
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

  async getById(customerId: number, context?: RequestContext): Promise<CustomerAggregate> {
    return this.workflowEngine.queries.getById(customerId, context)
  }

  async getProfile(customerId: number, context?: RequestContext): Promise<CustomerAggregate> {
    return this.getById(customerId, context)
  }

  async saveProfile(customer: CustomerAggregate): Promise<CustomerAggregate> {
    const updated = await this.repository.save(customer)

    const outbox = EventOutboxService.getInstance()
    await outbox.recordAndPublish({
      type: 'CUSTOMER_UPDATED',
      eventVersion: 1,
      customerId: updated.customerId,
      email: updated.email,
      fullName: updated.fullName,
      status: updated.status,
      timestamp: new Date().toISOString(),
    })

    return updated
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
    loyaltyData: { tier?: 'explorer' | 'voyager' | 'elite'; points?: number; totalSpent?: number; tierAchievedAt?: string },
    context?: RequestContext,
  ): Promise<void> {
    await this.repository.updateLoyaltyProfile(customerId, loyaltyData, context)
  }

  async ensureDeletionAllowed(customerId: number, req?: any): Promise<void> {
    const customer = await this.getById(customerId)
    const checks = await this.dependencyChecker.checkDependencies(customerId, req)
    const policyResult = CustomerPolicy.canDeleteAccount(customer, checks)

    if (!policyResult.allowed) {
      throw new CustomerDeletionNotAllowedException(
        policyResult.reason || 'Deletion not allowed',
        policyResult.code,
      )
    }

    await this.repository.cleanupProfileAssociatedData(customerId, req)
  }
}
