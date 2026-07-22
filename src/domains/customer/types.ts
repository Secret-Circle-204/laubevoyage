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

export interface CustomerAddressEntity {
  addressId: string
  customerId: number
  type: 'billing' | 'shipping' | 'home'
  street: string
  city: string
  country: string
  postalCode?: string
  isDefault: boolean
}

export interface DeviceSessionEntity {
  sessionId: string
  customerId: number
  deviceName: string
  ipAddress: string
  lastActiveAt: string
  isRevoked: boolean
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
