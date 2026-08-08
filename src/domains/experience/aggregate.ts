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
  basePriceEGP?: number // Optional catalog base price in EGP (undefined if not defined)
  availability: ExperienceAvailabilityStatus
  durationDays: number
  durationNights?: number
  version: number
  isActive: boolean
  createdAt: string
  updatedAt: string
  heroUrl?: string
  gallery?: string[]
  included?: string[]
  excluded?: string[]
  descriptionHtml?: string
  itinerary?: Array<{
    dayNumber: number
    title: string
    description: string
  }>
}
