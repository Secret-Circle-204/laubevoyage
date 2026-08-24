import { CustomerRepository } from '../repositories/customer-repository'
import type { CustomerAggregate } from '../aggregate'
import {
  DomainException,
  AuthenticationFailedException,
  AccountLockedException,
  AccountSuspendedException,
  AccountDeletedException,
  EmailNotVerifiedException,
} from '@/domains/shared/exceptions/domain-exception'

/**
 * Authentication Service
 * Handles customer login, failed login tracking, and account locking.
 */
export class AuthenticationService {
  private repository: CustomerRepository

  constructor(repository: CustomerRepository) {
    this.repository = repository
  }

  /**
   * Process post-authentication domain rules for an authenticated customer.
   */
  async onCustomerAuthenticated(customerId: number): Promise<CustomerAggregate> {
    const customer = await this.repository.findById(customerId)
    if (!customer) {
      throw new AuthenticationFailedException(`Customer with ID ${customerId} not found.`)
    }

    if (customer.status === 'suspended') {
      throw new AccountSuspendedException('Your account has been suspended. Please contact support.')
    }

    if (customer.status === 'deleted') {
      throw new AccountDeletedException('This account has been deleted.')
    }

    // Evaluate locking policy dynamically
    if (customer.lockedUntil) {
      const lockTime = new Date(customer.lockedUntil).getTime()
      if (lockTime > Date.now()) {
        throw new AccountLockedException()
      }
    }

    const updated: CustomerAggregate = {
      ...customer,
      lastLoginAt: new Date().toISOString(),
      failedLoginAttempts: 0,
      lockedUntil: undefined, // Clear lock state
    }

    return this.repository.save(updated)
  }

  /**
   * Authenticate customer with password and enforce domain policies.
   */
  async loginWithPassword(
    email: string,
    password?: string,
  ): Promise<{ user: CustomerAggregate; token: string }> {
    const normalizedEmail = email.trim().toLowerCase()
    const customer = await this.repository.findByEmail(normalizedEmail)

    if (!customer) {
      throw new AuthenticationFailedException('Invalid email or password')
    }

    // Pre-auth gates
    if (customer.status === 'deleted') {
      throw new AccountDeletedException('This account has been deleted.')
    }

    if (customer.status === 'suspended') {
      throw new AccountSuspendedException('Your account has been suspended. Please contact support.')
    }

    if (customer.lockedUntil) {
      const lockTime = new Date(customer.lockedUntil).getTime()
      if (lockTime > Date.now()) {
        throw new AccountLockedException()
      }
    }

    let loginResult: { user: CustomerAggregate; token: string }
    try {
      loginResult = await this.repository.login(normalizedEmail, password)
    } catch (err: unknown) {
      if (err instanceof EmailNotVerifiedException) {
        // Do not increment failed password attempts for unverified email
        throw err
      }

      if (err instanceof AuthenticationFailedException) {
        const currentAttempts = await this.repository.incrementFailedLoginAttempts(normalizedEmail)
        if (currentAttempts >= 5) {
          throw new AccountLockedException()
        }
        throw err
      }

      // Re-throw any other domain or unexpected infrastructure error
      throw err
    }

    if (!customer.isEmailVerified || customer.status === 'pending_verification') {
      throw new EmailNotVerifiedException('Please verify your email address before logging in.')
    }

    const authenticatedUser = await this.onCustomerAuthenticated(customer.customerId)

    return {
      user: authenticatedUser,
      token: loginResult.token,
    }
  }

  async authenticate(email: string): Promise<CustomerAggregate> {
    const customer = await this.repository.findByEmail(email)
    if (!customer) {
      throw new AuthenticationFailedException(`Invalid credentials for ${email}`)
    }

    return this.onCustomerAuthenticated(customer.customerId)
  }
}
