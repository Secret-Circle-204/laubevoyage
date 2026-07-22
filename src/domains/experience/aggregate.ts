import type { ExperienceType, ExperienceAvailabilityStatus } from './types'

/**
 * Experience Aggregate Root
 * Single source of truth for experience product catalog domain model and state.
 */
export interface ExperienceAggregate {
  id: number
  title: string
  slug: string
  type: ExperienceType
  cityId: number
  basePriceEGP: number // Minimum catalog fallback base price in EGP
  availability: ExperienceAvailabilityStatus
  capacityTotal: number
  durationDays: number
  durationNights?: number
  version: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}
