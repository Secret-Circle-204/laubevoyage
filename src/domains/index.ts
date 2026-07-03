import type { Payload } from 'payload'
import { BookingService } from './booking/service'
import { CurrencyService } from './currency/service'
import { DestinationService } from './destination/service'
import { LoyaltyService } from './loyalty/service'
import { CustomerService } from './customer/service'
import { PaymentService } from './payment/service'
import { NotificationService } from './notification/service'
import { TranslationService } from './translation/service'
import { LocalizationService } from './localization/service'

/**
 * Domain Services Factory
 * Provides centralized access to all domain services
 */
export class DomainServices {
  public readonly booking: BookingService
  public readonly currency: CurrencyService
  public readonly destination: DestinationService
  public readonly loyalty: LoyaltyService
  public readonly customer: CustomerService
  public readonly payment: PaymentService
  public readonly notification: NotificationService
  public readonly translation: TranslationService
  public readonly localization: LocalizationService

  constructor(payload: Payload) {
    this.currency = new CurrencyService(payload)
    this.loyalty = new LoyaltyService(payload)
    this.booking = new BookingService(payload)
    this.customer = new CustomerService(payload)
    this.destination = new DestinationService(payload)
    this.payment = new PaymentService(payload)
    this.notification = new NotificationService(payload)
    this.translation = new TranslationService(payload)
    this.localization = new LocalizationService(payload)
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
export { CurrencyCode } from '@/types'
export { CurrencyService } from './currency/service'
export { DestinationService } from './destination/service'
export { LoyaltyService } from './loyalty/service'
export { CustomerService } from './customer/service'
export { PaymentService } from './payment/service'
export { NotificationService } from './notification/service'
export { TranslationService } from './translation/service'
export { LocalizationService } from './localization/service'
