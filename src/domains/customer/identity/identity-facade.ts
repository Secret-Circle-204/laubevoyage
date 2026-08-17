import type { RequestContext } from '@/types'
import { CustomerRepository } from '../repositories/customer-repository'
import { RegistrationService } from './registration'
import { AuthenticationService } from './authentication'
import { VerificationService } from './verification'
import type { CustomerAggregate } from '../aggregate'
import type { CustomerPreferencesInput } from '../types'

/**
 * Identity Coordinator Facade
 * Facade coordinating Registration, Authentication, Verification, and Password sub-services via Constructor Dependency Injection.
 */
export class IdentityCoordinatorFacade {
  public registration: RegistrationService
  public authentication: AuthenticationService
  public verification: VerificationService
  public repository: CustomerRepository

  constructor(repository: CustomerRepository) {
    this.repository = repository
    this.registration = new RegistrationService(repository)
    this.authentication = new AuthenticationService(repository)
    this.verification = new VerificationService(repository)
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
    return this.registration.registerCustomer(email, firstName, lastName, password, preferences, options, context)
  }

  async verifyEmail(rawToken: string): Promise<number> {
    return this.verification.verifyEmailToken(rawToken)
  }

  async login(email: string): Promise<CustomerAggregate> {
    return this.authentication.authenticate(email)
  }

  async onCustomerAuthenticated(customerId: number): Promise<CustomerAggregate> {
    return this.authentication.onCustomerAuthenticated(customerId)
  }

  async handleFailedLogin(email: string): Promise<void> {
    await this.repository.incrementFailedLoginAttempts(email)
  }
}
