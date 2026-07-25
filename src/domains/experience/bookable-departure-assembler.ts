import type { ExperienceAggregate } from './aggregate'
import type { DepartureSlotEntity } from './types'
import { BookableDeparture } from './bookable-departure'
import type { BasePriceResolver } from './base-price-resolver'

/**
 * BookableDepartureAssembler
 * Pure Domain Component responsible for building the BookableDeparture Read Model.
 * Orchestrated by ExperienceService with pre-loaded aggregates.
 */
export class BookableDepartureAssembler {
  private priceResolver: BasePriceResolver

  constructor(priceResolver: BasePriceResolver) {
    this.priceResolver = priceResolver
  }

  /**
   * Assembles a BookableDeparture read model using pure domain entities.
   */
  assemble(experience: ExperienceAggregate, slot: DepartureSlotEntity): BookableDeparture {
    const effectivePrice = this.priceResolver.resolve(experience, slot)

    return new BookableDeparture({
      experienceId: experience.id,
      experienceTitle: experience.title,
      experienceType: experience.type,
      departureId: slot.departureId,
      date: slot.date,
      startTime: slot.startTime || '',
      basePriceEGP: effectivePrice,
      capacityAvailable: slot.capacityAvailable,
      capacityTotal: slot.capacityTotal,
      status: slot.status,
    })
  }
}
