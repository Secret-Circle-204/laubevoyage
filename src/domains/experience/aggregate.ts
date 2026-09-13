import type {
  ExperienceType,
  PackageMode,
  ExperienceAvailabilityStatus,
  ScheduleConfig,
  PriceOverrideEntry,
  PackageDuration,
  DailyTourDuration,
  AccommodationStayEntity,
  ExperienceChildPolicy,
  ItineraryDay,
} from './types'
import type { BlackoutEntry } from './blackout-policy'

/**
 * Base Experience Aggregate
 * Common catalog attributes shared across all experience types.
 */
export interface BaseExperienceAggregate {
  id: number
  title: string
  slug: string
  /** Origin / Departure Gateway City ID (authoritative departure location and timezone source) */
  cityId: number
  /** Ordered Post-Origin Journey Destination City IDs (subsequent destinations visited after Origin) */
  destinations?: number[]
  price: number // Canonical catalog default base price in EGP
  availability: ExperienceAvailabilityStatus
  schedules?: ScheduleConfig[]
  blackouts?: BlackoutEntry[]
  priceOverrides?: PriceOverrideEntry[]
  version: number
  isActive: boolean
  createdAt: string
  updatedAt: string
  heroUrl?: string
  gallery?: string[]
  included?: string[]
  excluded?: string[]
  descriptionHtml?: string
  itinerary?: ItineraryDay[]
  policiesHtml?: string
}

/**
 * Derives the canonical ordered journey trajectory (Origin + Post-Origin destinations)
 */
export function getExperienceTrajectory(exp: BaseExperienceAggregate): number[] {
  return [exp.cityId, ...(exp.destinations || [])]
}

/**
 * Package Experience Aggregate
 * Multi-day package with days/nights duration, optional departure slots, and optional accommodation stays.
 */
export interface PackageExperienceAggregate extends BaseExperienceAggregate {
  type: 'package'
  packageMode?: PackageMode
  duration: PackageDuration
  durationDays: number
  durationNights?: number
  durationMinutes?: never
  accommodations?: AccommodationStayEntity[]
  childPolicy?: ExperienceChildPolicy
}

/**
 * Daily Tour Experience Aggregate
 * Single-day intraday tour with durationMinutes and optional recurring schedules.
 */
export interface DailyTourExperienceAggregate extends BaseExperienceAggregate {
  type: 'daily_tour'
  packageMode?: never
  duration: DailyTourDuration
  durationMinutes: number
  durationDays?: never
  durationNights?: never
  accommodations?: never
  childPolicy?: never
}

/**
 * Experience Aggregate Root (Discriminated Union)
 * Single source of truth for experience product catalog domain model and state.
 */
export type ExperienceAggregate = PackageExperienceAggregate | DailyTourExperienceAggregate
