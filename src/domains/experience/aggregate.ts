import type {
  ExperienceType,
  PackageMode,
  ExperienceAvailabilityStatus,
  ScheduleConfig,
  PriceOverrideEntry,
  PackageDuration,
  DailyTourDuration,
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
  cityId: number
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
  itinerary?: Array<{
    dayNumber: number
    title: string
    description: string
  }>
  policiesHtml?: string
}

/**
 * Package Experience Aggregate
 * Multi-day package with days/nights duration and optional departure slots.
 */
export interface PackageExperienceAggregate extends BaseExperienceAggregate {
  type: 'package'
  packageMode?: PackageMode
  duration: PackageDuration
  durationDays: number
  durationNights?: number
  durationMinutes?: never
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
}

/**
 * Experience Aggregate Root (Discriminated Union)
 * Single source of truth for experience product catalog domain model and state.
 */
export type ExperienceAggregate = PackageExperienceAggregate | DailyTourExperienceAggregate
