import type { Experience } from '@/payload-types'
import type { ExperienceAggregate } from '../aggregate'
import type {
  ExperienceAvailabilityStatus,
  ScheduleConfig,
  AccommodationStayEntity,
  AccommodationOptionEntity,
  AccommodationPropertyEntity,
  RoomRateEntity,
  PricingUnit,
  OccupancyType,
  AccommodationType,
  BoardBasis,
  ExperienceOperationalMetadata,
  ExperienceChildPolicy,
} from '../types'
import { AccommodationPolicy, OCCUPANCY_GUEST_COUNT_MAP } from '../accommodation-policy'
import { serializeLexicalToHtml } from '@/lib/lexical'

/**
 * Maps raw database doc to strict ExperienceAggregate domain model with schema validations.
 */
export function mapExperienceDocToAggregate(
  doc: Experience | Record<string, unknown>,
): ExperienceAggregate {
  const docObj = doc as Experience
  const cityId = docObj.city
    ? typeof docObj.city === 'object'
      ? Number(docObj.city.id)
      : Number(docObj.city)
    : 0

  if (!docObj.title || typeof docObj.title !== 'string') {
    throw new Error(
      `[ExperienceRepository] Database record for experience #${docObj.id} is missing required title.`,
    )
  }
  if (!docObj.slug || typeof docObj.slug !== 'string') {
    throw new Error(
      `[ExperienceRepository] Database record for experience #${docObj.id} is missing required slug.`,
    )
  }
  if (docObj.type !== 'package' && docObj.type !== 'daily_tour') {
    throw new Error(
      `[ExperienceRepository] Database record for experience #${docObj.id} has invalid type: ${docObj.type}.`,
    )
  }
  if (!cityId || isNaN(cityId)) {
    throw new Error(
      `[ExperienceRepository] Database record for experience #${docObj.id} is missing required city relationship.`,
    )
  }
  if (!docObj.availability) {
    throw new Error(
      `[ExperienceRepository] Database record for experience #${docObj.id} is missing required availability.`,
    )
  }

  // Direct Group mapping for duration from Payload schema
  const isPackage = docObj.type === 'package'
  const isDailyTour = docObj.type === 'daily_tour'

  let durationDays: number | undefined = undefined
  let durationNights: number | undefined = undefined
  let durationMinutes: number | undefined = undefined

  if (isPackage) {
    const daysRaw =
      typeof docObj.duration?.days === 'number'
        ? docObj.duration.days
        : Number(docObj.duration?.days)
    if (isNaN(daysRaw) || daysRaw < 1) {
      throw new Error(
        `[ExperienceRepository] Database record for package #${docObj.id} is missing required duration.days (must be >= 1).`,
      )
    }
    durationDays = daysRaw

    const nightsRaw = docObj.duration?.nights
    if (nightsRaw !== undefined && nightsRaw !== null && !isNaN(Number(nightsRaw))) {
      durationNights = Number(nightsRaw)
    }
  } else if (isDailyTour) {
    const minutesRaw = docObj.duration?.durationMinutes
    if (
      minutesRaw === undefined ||
      minutesRaw === null ||
      isNaN(Number(minutesRaw)) ||
      Number(minutesRaw) < 15
    ) {
      throw new Error(
        `[ExperienceRepository] Daily Tour #${docObj.id} is missing required duration.durationMinutes (must be >= 15 minutes).`,
      )
    }
    durationMinutes = Number(minutesRaw)
  }

  // Price validation
  let price = 0
  if (docObj.price !== null && docObj.price !== undefined && !isNaN(Number(docObj.price))) {
    price = Number(docObj.price)
    if (price < 0) {
      throw new Error(
        `[ExperienceRepository] Experience #${docObj.id} has invalid negative price: ${price}.`,
      )
    }
  } else if (docObj.type === 'daily_tour') {
    throw new Error(
      `[ExperienceRepository] Daily Tour #${docObj.id} is missing required price in EGP.`,
    )
  }

  // Policies Lexical serialization
  const policiesHtml = docObj.policies
    ? serializeLexicalToHtml(docObj.policies) || undefined
    : undefined

  // Hero image mapping
  let heroUrl: string | undefined = undefined
  if (
    docObj.hero &&
    typeof docObj.hero === 'object' &&
    'url' in docObj.hero &&
    typeof docObj.hero.url === 'string'
  ) {
    heroUrl = docObj.hero.url
  }

  // Gallery array mapping
  const gallery: string[] = Array.isArray(docObj.gallery)
    ? docObj.gallery
        .map((img) => {
          const media = img?.image
          if (
            media &&
            typeof media === 'object' &&
            'url' in media &&
            typeof media.url === 'string'
          ) {
            return media.url
          }
          return ''
        })
        .filter(Boolean)
    : []

  const included: string[] = Array.isArray(docObj.included)
    ? docObj.included.map((x) => x?.item || (typeof x === 'string' ? x : '')).filter(Boolean)
    : []

  const excluded: string[] = Array.isArray(docObj.excluded)
    ? docObj.excluded.map((x) => x?.item || (typeof x === 'string' ? x : '')).filter(Boolean)
    : []

  const destinations: number[] = Array.isArray((docObj as any).destinations)
    ? (docObj as any).destinations
        .map((d: any) => (typeof d === 'object' && d !== null ? Number(d.id) : Number(d)))
        .filter((id: number) => !isNaN(id) && id > 0)
    : []

  const itinerary = Array.isArray(docObj.itinerary)
    ? docObj.itinerary.map((x, idx) => {
        const rawDay = typeof x?.dayNumber === 'number' ? x.dayNumber : Number(x?.dayNumber)
        const dayNumber = !isNaN(rawDay) && rawDay >= 1 ? rawDay : idx + 1
        const rawCity = (x as any)?.city
        const cityId = rawCity
          ? typeof rawCity === 'object' && rawCity !== null
            ? Number(rawCity.id)
            : Number(rawCity)
          : undefined
        const cityName = rawCity && typeof rawCity === 'object' && 'name' in rawCity ? String(rawCity.name) : undefined
        return {
          dayNumber,
          title: typeof x?.title === 'string' ? x.title : '',
          description: typeof x?.description === 'string' ? x.description : '',
          cityId: cityId && !isNaN(cityId) && cityId > 0 ? cityId : undefined,
          cityName,
        }
      })
    : []

  const descriptionHtml = docObj.description ? serializeLexicalToHtml(docObj.description) : ''

  const baseAggregate = {
    id: Number(docObj.id),
    title: docObj.title,
    slug: docObj.slug,
    cityId,
    destinations: destinations.length > 0 ? destinations : undefined,
    price,
    availability: docObj.availability as ExperienceAvailabilityStatus,
    version: 1,
    isActive: docObj.isActive ?? true,
    heroUrl,
    createdAt:
      typeof docObj.createdAt === 'string'
        ? docObj.createdAt
        : docObj.createdAt
          ? new Date(docObj.createdAt).toISOString()
          : new Date().toISOString(),
    updatedAt:
      typeof docObj.updatedAt === 'string'
        ? docObj.updatedAt
        : docObj.updatedAt
          ? new Date(docObj.updatedAt).toISOString()
          : new Date().toISOString(),
    gallery,
    included,
    excluded,
    descriptionHtml,
    itinerary,
    policiesHtml,
  }

  if (docObj.type === 'package') {
    const durationObj = docObj.duration as Record<string, unknown> | null | undefined
    if (!durationObj || typeof durationObj !== 'object') {
      throw new Error(
        `[ExperienceRepository] Database record for package #${docObj.id} is missing required duration.days (must be >= 1).`,
      )
    }

    const rawDays = durationObj.days
    if (
      rawDays === undefined ||
      rawDays === null ||
      rawDays === '' ||
      (typeof rawDays !== 'number' && isNaN(Number(rawDays)))
    ) {
      throw new Error(
        `[ExperienceRepository] Database record for package #${docObj.id} is missing required duration.days (must be >= 1).`,
      )
    }
    const days = Number(rawDays)
    if (isNaN(days) || days < 1) {
      throw new Error(
        `[ExperienceRepository] Database record for package #${docObj.id} is missing required duration.days (must be >= 1).`,
      )
    }

    let nights: number | undefined = undefined
    const rawNights = durationObj.nights
    if (rawNights !== undefined && rawNights !== null && rawNights !== '') {
      const parsedNights = Number(rawNights)
      if (isNaN(parsedNights) || parsedNights < 0) {
        throw new Error(
          `[ExperienceRepository] Package #${docObj.id} has invalid duration.nights: ${rawNights} (must be >= 0).`,
        )
      }
      nights = parsedNights
    }

    let accommodations: AccommodationStayEntity[] | undefined = undefined
    if (Array.isArray((docObj as any).accommodations) && (docObj as any).accommodations.length > 0) {
      const validation = AccommodationPolicy.validate('package', (docObj as any).accommodations)
      if (!validation.valid) {
        throw new Error(
          `[ExperienceRepository] Package #${docObj.id} accommodation validation failed: ${validation.errors.join('; ')}`,
        )
      }

      const mapOption = (optRaw: any): AccommodationOptionEntity => {
        const propertyId = optRaw.property
          ? typeof optRaw.property === 'object'
            ? Number(optRaw.property.id)
            : Number(optRaw.property)
          : Number(optRaw.propertyId)

        let property: AccommodationPropertyEntity | undefined = undefined
        if (optRaw.property && typeof optRaw.property === 'object') {
          const propObj = optRaw.property
          const propCityId = propObj.city
            ? typeof propObj.city === 'object'
              ? Number(propObj.city.id)
              : Number(propObj.city)
            : 0

          property = {
            id: Number(propObj.id),
            name: String(propObj.name || ''),
            slug: String(propObj.slug || ''),
            type: propObj.type as AccommodationType,
            cityId: propCityId,
            rating:
              propObj.rating !== undefined && propObj.rating !== null
                ? Number(propObj.rating)
                : undefined,
            heroUrl:
              propObj.heroImage &&
              typeof propObj.heroImage === 'object' &&
              propObj.heroImage.url
                ? propObj.heroImage.url
                : undefined,
            descriptionHtml: propObj.description
              ? serializeLexicalToHtml(propObj.description)
              : undefined,
            isActive: propObj.isActive ?? true,
          }
        }

        const pricingUnit = (optRaw.pricingUnit === 'per_night' ? 'per_night' : 'per_stay') as PricingUnit

        const roomRates: RoomRateEntity[] = Array.isArray(optRaw.roomRates)
          ? optRaw.roomRates.map((rateObj: any) => {
              const occupancy = rateObj.occupancy as OccupancyType
              const guestCount = OCCUPANCY_GUEST_COUNT_MAP[occupancy] || 1
              const rawRate = Number(rateObj.rateEGP)
              const rateEGP = !isNaN(rawRate) && rawRate >= 0 ? rawRate : 0
              const enabled = rateObj.enabled !== false
              return {
                occupancy,
                guestCount,
                rateEGP,
                enabled,
              }
            })
          : []

        return {
          id: optRaw.id ? String(optRaw.id) : undefined,
          propertyId,
          property,
          roomCategory: optRaw.roomCategory ? String(optRaw.roomCategory) : undefined,
          boardBasis: optRaw.boardBasis ? (optRaw.boardBasis as BoardBasis) : undefined,
          pricingUnit,
          isDefault: Boolean(optRaw.isDefault),
          roomRates,
        }
      }

      accommodations = (docObj as any).accommodations
        .map((stayRaw: any) => {
          let options: AccommodationOptionEntity[] = []

          if (Array.isArray(stayRaw.options) && stayRaw.options.length > 0) {
            options = stayRaw.options.map(mapOption)
          } else if (stayRaw.property || stayRaw.propertyId) {
            // Temporary Transitional Adapter: Wrap unmigrated legacy single-hotel stay into one AccommodationOption
            options = [mapOption(stayRaw)]
          }

          return {
            id: stayRaw.id ? String(stayRaw.id) : undefined,
            order: Number(stayRaw.order),
            nights: Number(stayRaw.nights),
            options,
          }
        })
        .sort((a: AccommodationStayEntity, b: AccommodationStayEntity) => a.order - b.order)
    }

    let childPolicy: ExperienceChildPolicy | undefined = undefined
    if (docObj.childPolicy && typeof docObj.childPolicy === 'object') {
      const cp = docObj.childPolicy as Record<string, unknown>
      childPolicy = {
        childrenAllowed: cp.childrenAllowed !== false,
        childSharingBedPercentage:
          cp.childSharingBedPercentage !== undefined && cp.childSharingBedPercentage !== null
            ? Number(cp.childSharingBedPercentage)
            : 50,
        childExtraBedPercentage:
          cp.childExtraBedPercentage !== undefined && cp.childExtraBedPercentage !== null
            ? Number(cp.childExtraBedPercentage)
            : 75,
      }
    }

    return {
      ...baseAggregate,
      type: 'package' as const,
      packageMode: docObj.packageMode || undefined,
      duration: { days, nights },
      durationDays: days,
      durationNights: nights,
      accommodations,
      childPolicy,
    }
  }

  if (docObj.type === 'daily_tour') {
    if (Array.isArray((docObj as any).accommodations) && (docObj as any).accommodations.length > 0) {
      throw new Error(
        `[ExperienceRepository] Daily Tour #${docObj.id} cannot contain accommodation stays.`,
      )
    }

    const durationObj = docObj.duration as Record<string, unknown> | null | undefined
    if (!durationObj || typeof durationObj !== 'object') {
      throw new Error(
        `[ExperienceRepository] Daily Tour #${docObj.id} is missing required duration.durationMinutes (must be >= 15 minutes).`,
      )
    }

    const rawMinutes = durationObj.durationMinutes
    if (
      rawMinutes === undefined ||
      rawMinutes === null ||
      rawMinutes === '' ||
      (typeof rawMinutes !== 'number' && isNaN(Number(rawMinutes)))
    ) {
      throw new Error(
        `[ExperienceRepository] Daily Tour #${docObj.id} is missing required duration.durationMinutes (must be >= 15 minutes).`,
      )
    }
    const durationMinutes = Number(rawMinutes)
    if (isNaN(durationMinutes) || durationMinutes < 15) {
      throw new Error(
        `[ExperienceRepository] Daily Tour #${docObj.id} is missing required duration.durationMinutes (must be >= 15 minutes).`,
      )
    }

    const schedules: ScheduleConfig[] = Array.isArray(docObj.schedules)
      ? docObj.schedules.map((s) => {
          if (!s?.startTime || typeof s.startTime !== 'string') {
            throw new Error(
              `[ExperienceRepository] Experience #${docObj.id} schedule has missing or invalid startTime.`,
            )
          }
          let defaultCapacity: number | undefined
          if (s.defaultCapacity !== undefined && s.defaultCapacity !== null) {
            const rawCap =
              typeof s.defaultCapacity === 'number'
                ? s.defaultCapacity
                : Number(s.defaultCapacity)
            if (isNaN(rawCap) || rawCap < 1) {
              throw new Error(
                `[ExperienceRepository] Experience #${docObj.id} schedule for ${s.startTime} has invalid defaultCapacity (must be >= 1).`,
              )
            }
            defaultCapacity = rawCap
          }
          return {
            startTime: s.startTime,
            defaultCapacity,
            label: s.label ? String(s.label) : undefined,
          }
        })
      : []

    const blackouts = Array.isArray(docObj.blackouts)
      ? docObj.blackouts.map((b) => ({
          date:
            typeof b.date === 'string'
              ? b.date.split('T')[0]
              : b.date
                ? new Date(b.date).toISOString().split('T')[0]
                : '',
          startTime: b.startTime ? String(b.startTime) : undefined,
          reason: b.reason ? String(b.reason) : undefined,
        }))
      : []

    const priceOverrides = Array.isArray(docObj.priceOverrides)
      ? docObj.priceOverrides.map((p) => ({
          date:
            typeof p.date === 'string'
              ? p.date.split('T')[0]
              : p.date
                ? new Date(p.date).toISOString().split('T')[0]
                : '',
          startTime: p.startTime ? String(p.startTime) : undefined,
          priceEGP: Number(p.priceEGP) || 0,
          reason: p.reason ? String(p.reason) : undefined,
        }))
      : []

    return {
      ...baseAggregate,
      type: 'daily_tour' as const,
      schedules,
      blackouts,
      priceOverrides,
      duration: { durationMinutes },
      durationMinutes,
    }
  }

  throw new Error(
    `[ExperienceRepository] Experience #${docObj.id} has invalid type: ${(docObj as any).type}`,
  )
}

/**
 * Maps raw database doc to lightweight ExperienceOperationalMetadata for operational use cases
 * (e.g. Departure Slots, Scheduling, Capacity Checks) without hydrating sub-models like Accommodations.
 */
export function mapExperienceDocToOperationalMetadata(
  doc: Experience | Record<string, unknown>,
): ExperienceOperationalMetadata {
  const docObj = doc as Experience
  const cityId = docObj.city
    ? typeof docObj.city === 'object'
      ? Number(docObj.city.id)
      : Number(docObj.city)
    : 0

  if (!docObj.title || typeof docObj.title !== 'string') {
    throw new Error(
      `[ExperienceRepository] Database record for experience #${docObj.id} is missing required title.`,
    )
  }
  if (!docObj.slug || typeof docObj.slug !== 'string') {
    throw new Error(
      `[ExperienceRepository] Database record for experience #${docObj.id} is missing required slug.`,
    )
  }
  if (docObj.type !== 'package' && docObj.type !== 'daily_tour') {
    throw new Error(
      `[ExperienceRepository] Database record for experience #${docObj.id} has invalid type: ${docObj.type}.`,
    )
  }
  if (!cityId || isNaN(cityId)) {
    throw new Error(
      `[ExperienceRepository] Database record for experience #${docObj.id} is missing required city relationship.`,
    )
  }
  if (!docObj.availability) {
    throw new Error(
      `[ExperienceRepository] Database record for experience #${docObj.id} is missing required availability.`,
    )
  }

  let durationDays = 1
  let durationMinutes: number | undefined = undefined

  if (docObj.type === 'package') {
    const rawDays = docObj.duration?.days
    durationDays = typeof rawDays === 'number' ? rawDays : Number(rawDays) || 1
  } else if (docObj.type === 'daily_tour') {
    const rawMinutes = docObj.duration?.durationMinutes
    durationMinutes = typeof rawMinutes === 'number' ? rawMinutes : Number(rawMinutes) || 15
  }

  const price = Number(docObj.price) || 0

  const schedules: ScheduleConfig[] = Array.isArray(docObj.schedules)
    ? docObj.schedules
        .map((s) => ({
          startTime: String(s?.startTime || ''),
          defaultCapacity:
            s?.defaultCapacity !== undefined && s?.defaultCapacity !== null
              ? Number(s.defaultCapacity)
              : undefined,
          label: s?.label ? String(s.label) : undefined,
        }))
        .filter((s) => Boolean(s.startTime))
    : []

  const destinations: number[] = Array.isArray((docObj as any).destinations)
    ? (docObj as any).destinations
        .map((d: any) => (typeof d === 'object' && d !== null ? Number(d.id) : Number(d)))
        .filter((id: number) => !isNaN(id) && id > 0)
    : []

  return {
    id: Number(docObj.id),
    title: docObj.title,
    slug: docObj.slug,
    cityId,
    destinations: destinations.length > 0 ? destinations : undefined,
    type: docObj.type,
    packageMode: docObj.packageMode || undefined,
    durationDays,
    durationMinutes,
    price,
    availability: docObj.availability as ExperienceAvailabilityStatus,
    schedules,
    version: 1,
    isActive: docObj.isActive ?? true,
  }
}
