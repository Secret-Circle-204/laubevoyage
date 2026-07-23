/**
 * Domain Module Central Exports
 * Composition Root is unified in ./factory.ts
 */
export { getDomainServices } from './factory'

// Export individual services for direct imports
export { BookingService } from './booking/service'
export type { CurrencyCode } from '@/types'
export { CurrencyService } from './currency/service'
export { DestinationService } from './destination/service'
export { LoyaltyService } from './loyalty/service'
export { CustomerService } from './customer/service'
export { PaymentService } from './payment/service'
export { NotificationService } from './notification/service'
export { TranslationService } from './translation/service'
export { LocalizationService } from './localization/service'
