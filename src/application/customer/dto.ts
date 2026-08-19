export interface CompanionTravelerDTO {
  id: string
  firstName: string
  lastName: string
  relationship: string
  dateOfBirth?: string
  passportNumber?: string
}

export interface CustomerAddressDTO {
  id: string
  type: 'billing' | 'shipping' | 'home'
  street: string
  city: string
  country: string
  postalCode?: string
  isDefault: boolean
}

export interface DeviceSessionDTO {
  sessionId: string
  deviceName: string
  ipAddress: string
  lastActiveAt: string
  isRevoked: boolean
}

export interface CustomerProfileDataDTO {
  firstName: string
  lastName: string
  email: string
  phone?: string
  passportNumber?: string
  nationality?: string
  travelers: CompanionTravelerDTO[]
  addresses: CustomerAddressDTO[]
}

export interface CustomerSettingsDataDTO {
  email: boolean
  sms: boolean
  push: boolean
  activeSessions: DeviceSessionDTO[]
}


