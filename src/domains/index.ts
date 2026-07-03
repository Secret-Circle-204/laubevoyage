import type { Payload } from 'payload'
import { BookingService } from './booking/service'
import { CurrencyService } from './currency/service'
import { DestinationService } from './destination/service'
import { LoyaltyService } from './loyalty/service'
import { UserService } from './user/service'
import { PaymentService } from './payment/service'
import { NotificationService } from './notification/service'

/**
 * Domain Services Factory
 * Provides centralized access to all domain services
 */
export class DomainServices {
  public readonly booking: BookingService
  public readonly currency: CurrencyService
  public readonly destination: DestinationService
  public readonly loyalty: LoyaltyService
  public readonly user: UserService
  public readonly payment: PaymentService
  public readonly notification: NotificationService

  constructor(payload: Payload) {
    this.currency = new CurrencyService(payload)
    this.loyalty = new LoyaltyService(payload)
    this.booking = new BookingService(payload)
    this.user = new UserService(payload)
    this.destination = new DestinationService(payload)
    this.payment = new PaymentService(payload)
    this.notification = new NotificationService(payload)
  }
}

/**
 * Get domain services instance
 */
export function getDomainServices(payload: Payload): DomainServices {
  return new DomainServices(payload)
}

// Export individual services for direct imports
export { BookingService } from './booking/service'
export { CurrencyService } from './currency/service'
export { DestinationService } from './destination/service'
export { LoyaltyService } from './loyalty/service'
export { UserService } from './user/service'
export { PaymentService } from './payment/service'
export { NotificationService } from './notification/service'
