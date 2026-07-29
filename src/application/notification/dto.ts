/**
 * Application Notification DTOs
 * Strongly typed DTO contracts passed to NotificationTemplateEngine and Dispatchers.
 * Pure read-model data structures without business logic.
 */

export interface WelcomeEmailDTO {
  name: string
  email?: string
}

export interface BookingConfirmationEmailDTO {
  bookingNumber: string
  customerName: string
  experienceTitle?: string
  departureDate?: string
  passengersCount?: number
  totalCost?: string
  currency?: string
}

export interface PaymentReceiptEmailDTO {
  amount: number | string
  currency: string
  transactionReference?: string
  customerName?: string
  gateway?: string
}

export interface TierUpgradedEmailDTO {
  customerId: number
  customerName?: string
  newTier: string
  bonusGranted?: number
}

export type EmailNotificationDTO =
  | { templateId: 'welcome_email'; data: WelcomeEmailDTO }
  | { templateId: 'booking_confirmation'; data: BookingConfirmationEmailDTO }
  | { templateId: 'payment_receipt'; data: PaymentReceiptEmailDTO }
  | { templateId: 'tier_upgraded'; data: TierUpgradedEmailDTO }
