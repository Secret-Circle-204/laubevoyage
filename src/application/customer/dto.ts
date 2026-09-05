export interface CompanionTravelerDTO {
  id: string
  firstName: string
  lastName: string
  relationship: string
  dateOfBirth?: string
  passportNumber?: string
}

export interface CustomerProfileDataDTO {
  firstName: string
  lastName: string
  email: string
  phone?: string
  passportNumber?: string
  nationality?: string
  travelers: CompanionTravelerDTO[]
  totalCompanions: number
}

export interface CustomerSettingsDataDTO {
  email: boolean
  sms: boolean
  push: boolean
}


