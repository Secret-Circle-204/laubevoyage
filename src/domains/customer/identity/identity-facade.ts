import type { Payload } from 'payload'
import { CustomerRepository } from '../repositories/customer-repository'
import { RegistrationService } from './registration'
import { AuthenticationService } from './authentication'
import { VerificationService } from './verification'
import type { CustomerAggregate } from '../aggregate'

/**
 * Identity Coordinator Facade
 * Facade coordinating Registration, Authentication, Verification, and Password sub-services.
 */
export class IdentityCoordinatorFacade {
  public registration: RegistrationService
  public authentication: AuthenticationService
  public verification: VerificationService
  public repository: CustomerRepository

  constructor(payload: Payload, repository: CustomerRepository) {
    this.repository = repository
    this.registration = new RegistrationService(payload, repository)
    this.authentication = new AuthenticationService(repository)
    this.verification = new VerificationService(repository)
  }

  async registerCustomer(email: string, firstName: string, lastName: string): Promise<CustomerAggregate> {
    return this.registration.registerCustomer(email, firstName, lastName)
  }

  async verifyEmail(customerId: number, rawToken: string): Promise<CustomerAggregate> {
    return this.verification.verifyEmailToken(customerId, rawToken)
  }

  async login(email: string): Promise<CustomerAggregate> {
    return this.authentication.authenticate(email)
  }
}
