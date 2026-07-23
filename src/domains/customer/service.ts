import type { Payload } from 'payload'
import { CustomerWorkflowEngine } from './workflow'
import type { CustomerAggregate } from './aggregate'
import type { CompanionTravelerEntity, CustomerAddressEntity, DeviceSessionEntity } from './types'

/**
 * Customer Domain Service (Enterprise Thin Facade)
 * Single entry point for all Customer & Identity operations.
 * Delegated to CustomerWorkflowEngine for single-responsibility orchestration.
 */
export class CustomerService {
  private workflowEngine: CustomerWorkflowEngine

  constructor(payload: Payload) {
    this.workflowEngine = new CustomerWorkflowEngine(payload)
  }

  async registerCustomer(email: string, firstName: string, lastName: string): Promise<CustomerAggregate> {
    return this.workflowEngine.executeRegisterWorkflow(email, firstName, lastName)
  }

  async verifyEmail(customerId: number, rawToken: string): Promise<CustomerAggregate> {
    return this.workflowEngine.executeVerifyEmailWorkflow(customerId, rawToken)
  }

  async login(email: string): Promise<CustomerAggregate> {
    return this.workflowEngine.identity.login(email)
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
