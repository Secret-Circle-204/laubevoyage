import { LoyaltyTier } from '@/types'
import type { ConvertedPrice } from '@/domains/currency/types'

export interface PublicLoyaltyConfigDTO {
  welcomeBonus: number
}

export interface PointsValueGuideDTO {
  title: string
  description: string
  unitText: string
}

export interface LoyaltyRedemptionRateDTO {
  pointsUnit: number
  baseValue: number
  baseCurrency: string
  displayValue: string
}

export interface LoyaltyTierThresholdDTO {
  tier: LoyaltyTier
  minSpentEGP: number
  formattedMinSpent: string
  translatedTierName: string
}

export interface LoyaltyLedgerRecordDTO {
  id: string
  createdAt: string
  points: number
  type: string
  reason: string
  isPositive: boolean
}

export interface CustomerLoyaltyPortalDTO {
  pointsBalance: number
  formattedPointsBalance: string
  pointsMonetaryValue: ConvertedPrice
  pointsValuesAllCurrencies: ConvertedPrice[]
  pointsValueGuide: PointsValueGuideDTO
  currentTier: LoyaltyTier
  translatedCurrentTier: string
  formattedMemberTier: string
  redemptionRate: LoyaltyRedemptionRateDTO
  tierThresholds: LoyaltyTierThresholdDTO[]
  totalSpentEGP: number
  formattedTotalSpentEGP: string
  nextTierProgressPercent: number
  remainingQualifyingSpendEGP: number | null
  formattedRemainingQualifyingSpend: string | null
  nextTierName: string
  progressText: string
  heldPoints: number
  availablePoints: number
  formattedAvailablePoints: string
  history: LoyaltyLedgerRecordDTO[]
  uiLabels: {
    pageTitle: string
    pageSubtitle: string
    tierMemberSuffix: string
    availableBalance: string
    pointsUnit: string
    cashValuePrefix: string
    cashValueSuffix: string
    heldPointsNotice: string
    totalQualifyingSpend: string
    instantCheckoutDiscount: string
    officialRate: string
    yourPointsValue: string
    transactionHistoryTitle: string
    noTransactions: string
    dateCol: string
    referenceCol: string
    typeCol: string
    reasonCol: string
    pointsCol: string
  }
  pagination?: {
    page: number
    limit: number
    totalDocs: number
    totalPages: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }
}
