import type { DepartureSlotStatus, ExperienceType } from './types'

/**
 * BookableDeparture
 * Ephemeral Domain Read Model representing a composite of catalog and slot details.
 * Consumed momentarily for pricing computations and booking validation.
 */
export class BookableDeparture {
  readonly id?: number
  readonly experienceId: number
  readonly experienceTitle: string
  readonly experienceType: ExperienceType
  readonly departureId: string
  readonly date: string // YYYY-MM-DD
  readonly startTime?: string
  readonly effectiveBasePrice: number
  readonly capacityAvailable?: number
  readonly capacityTotal?: number
  readonly status: DepartureSlotStatus

  constructor(params: {
    id?: number
    experienceId: number
    experienceTitle: string
    experienceType: ExperienceType
    departureId: string
    date: string
    startTime?: string
    effectiveBasePrice: number
    capacityAvailable?: number
    capacityTotal?: number
    status: DepartureSlotStatus
  }) {
    this.id = params.id
    this.experienceId = params.experienceId
    this.experienceTitle = params.experienceTitle
    this.experienceType = params.experienceType
    this.departureId = params.departureId
    this.date = params.date
    this.startTime = params.startTime
    this.effectiveBasePrice = params.effectiveBasePrice
    this.capacityAvailable = params.capacityAvailable
    this.capacityTotal = params.capacityTotal
    this.status = params.status
  }
}
