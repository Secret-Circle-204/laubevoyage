export type CustomerStatus = 'pending_verification' | 'active' | 'suspended' | 'pending_deletion' | 'deleted'

export interface CompanionTravelerEntity {
  travelerId: string
  customerId: number
  firstName: string
  lastName: string
  dateOfBirth?: string
  passportNumber?: string
  relationship: 'spouse' | 'child' | 'parent' | 'friend' | 'other'
}

export interface GranularGDPRConsent {
  marketingConsent: boolean
  dataProcessingConsent: boolean
  privacyPolicyVersion: string
  termsVersion: string
  cookieVersion: string
  consentedAt: string
}

export interface NotificationChannelPreferences {
  marketing: { email: boolean; sms: boolean; push: boolean }
  booking: { email: boolean; sms: boolean; push: boolean }
  payment: { email: boolean; sms: boolean; push: boolean }
  loyalty: { email: boolean; sms: boolean; push: boolean }
}

export interface CustomerPolicyResult {
  allowed: boolean
  code?: string
  reason?: string
}

export interface CustomerPreferencesInput {
  preferredLanguage?: string
  preferredCurrency?: string
}

export class CustomerDeletionNotAllowedException extends Error {
  code: string
  constructor(reason: string, code = 'DELETION_NOT_ALLOWED') {
    super(reason)
    this.name = 'CustomerDeletionNotAllowedException'
    this.code = code
  }
}

export interface CustomerDeletionDependencyChecker {
  checkDependencies(customerId: number, req?: any): Promise<{
    bookingCount: number
    pointLedgerCount: number
    reviewCount: number
    paymentCount: number
    pendingOutboxCount?: number
  }>
}

