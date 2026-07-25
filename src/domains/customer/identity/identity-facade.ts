import { CustomerRepository } from '../repositories/customer-repository'
import { RegistrationService } from './registration'
import { AuthenticationService } from './authentication'
import { VerificationService } from './verification'
import type { CustomerAggregate } from '../aggregate'

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
    options?: { eventSource?: 'domain' | 'external' },
  ): Promise<CustomerAggregate> {
    return this.registration.registerCustomer(email, firstName, lastName, password, options)
  }

  async verifyEmail(customerId: number, rawToken: string): Promise<CustomerAggregate> {
    return this.verification.verifyEmailToken(customerId, rawToken)
  }

  async login(email: string): Promise<CustomerAggregate> {
    return this.authentication.authenticate(email)
  }

  async onCustomerAuthenticated(customerId: number): Promise<CustomerAggregate> {
    return this.authentication.onCustomerAuthenticated(customerId)
  }
}
