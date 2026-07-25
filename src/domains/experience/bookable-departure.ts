import type { DepartureSlotStatus, ExperienceType } from './types'

/**
 * BookableDeparture
 * Ephemeral Domain Read Model representing a composite of catalog and slot details.
 * Consumed momentarily for pricing computations and booking validation.
 */
export class BookableDeparture {
  readonly experienceId: number
  readonly experienceTitle: string
  readonly experienceType: ExperienceType
  readonly departureId: string
  readonly date: string // YYYY-MM-DD
  readonly startTime: string
  readonly basePriceEGP: number
  readonly capacityAvailable: number
  readonly capacityTotal: number
  readonly status: DepartureSlotStatus

  constructor(params: {
    experienceId: number
    experienceTitle: string
    experienceType: ExperienceType
    departureId: string
    date: string
    startTime: string
    basePriceEGP: number
    capacityAvailable: number
    capacityTotal: number
    status: DepartureSlotStatus
  }) {
    this.experienceId = params.experienceId
    this.experienceTitle = params.experienceTitle
    this.experienceType = params.experienceType
    this.departureId = params.departureId
    this.date = params.date
    this.startTime = params.startTime
    this.basePriceEGP = params.basePriceEGP
    this.capacityAvailable = params.capacityAvailable
    this.capacityTotal = params.capacityTotal
    this.status = params.status
  }
}
