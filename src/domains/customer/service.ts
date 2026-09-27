import type { RequestContext, LoyaltyTier, PaginatedResponse } from '@/types'
import { CustomerWorkflowEngine, type VerificationResult, type ResendVerificationResult } from './workflow'
import { CustomerRepository } from './repositories/customer-repository'
import { TravelerRepository } from './repositories/traveler-repository'
import type { CustomerAggregate } from './aggregate'
import type { Customer } from '@/payload-types'
import {
  type CompanionTravelerEntity,
  type TravelerReportRecord,
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
    phone: string,
    password?: string,
    preferences?: CustomerPreferencesInput,
    options?: { eventSource?: 'domain' | 'external' },
    context?: RequestContext,
  ): Promise<CustomerAggregate> {
    return this.workflowEngine.executeRegisterWorkflow(
      email,
      firstName,
      lastName,
      phone,
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
      aggregateType: 'Customer',
      aggregateId: String(customer.customerId),
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

  async resendVerification(email: string, context?: RequestContext): Promise<ResendVerificationResult> {
    return this.workflowEngine.executeResendVerificationWorkflow(email, context)
  }

  async login(email: string): Promise<CustomerAggregate> {
    return this.workflowEngine.identity.login(email)
  }

  async loginWithPassword(
    email: string,
    password?: string,
  ): Promise<{ user: CustomerAggregate; token: string }> {
    return this.workflowEngine.identity.loginWithPassword(email, password)
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
      aggregateType: 'Customer',
      aggregateId: String(updated.customerId),
      eventVersion: 1,
      customerId: updated.customerId,
      email: updated.email,
      fullName: updated.fullName,
      status: updated.status,
      timestamp: new Date().toISOString(),
    })

    return updated
  }

  async updateStatus(
    customerId: number,
    status: 'active' | 'suspended',
    reason?: string,
    context?: RequestContext,
  ): Promise<CustomerAggregate> {
    const customer = await this.getById(customerId, context)
    const oldStatus = customer.status
    const updated = await this.repository.save(
      {
        ...customer,
        status,
      },
      context,
    )

    const outbox = EventOutboxService.getInstance()
    await outbox.recordAndPublish(
      {
        type: 'CUSTOMER_STATUS_UPDATED',
        aggregateType: 'Customer',
        aggregateId: String(updated.customerId),
        eventVersion: 1,
        customerId: updated.customerId,
        oldStatus,
        newStatus: status,
        reason,
        timestamp: new Date().toISOString(),
      },
      context,
    )

    await outbox.recordAndPublish(
      {
        type: 'CUSTOMER_UPDATED',
        aggregateType: 'Customer',
        aggregateId: String(updated.customerId),
        eventVersion: 1,
        customerId: updated.customerId,
        email: updated.email,
        fullName: updated.fullName,
        status: updated.status,
        timestamp: new Date().toISOString(),
      },
      context,
    )

    return updated
  }

  async getSavedCompanions(customerId: number): Promise<CompanionTravelerEntity[]> {
    return this.workflowEngine.profileManager.getSavedCompanions(customerId)
  }

  async saveCompanion(
    customerId: number,
    travelerId: number,
    relationship: 'spouse' | 'child' | 'parent' | 'friend' | 'self' | 'other' = 'other',
  ): Promise<void> {
    return this.workflowEngine.profileManager.saveCompanion(customerId, travelerId, relationship)
  }

  async getTravelersReport(options?: {
    page?: number
    limit?: number
    search?: string
  }): Promise<PaginatedResponse<TravelerReportRecord>> {
    return this.workflowEngine.profileManager.getTravelersReport(options)
  }

  async handleFailedLogin(email: string): Promise<void> {
    await this.workflowEngine.identity.handleFailedLogin(email)
  }

  async updateLoyaltyProfile(
    customerId: number,
    loyaltyData: { tier?: LoyaltyTier; points?: number; totalSpent?: number; tierAchievedAt?: string },
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

  /**
   * Get the authoritative TravelerRepository for canonical identity resolution.
   */
  getTravelerRepository(): TravelerRepository {
    return this.workflowEngine.travelerRepository
  }
}
