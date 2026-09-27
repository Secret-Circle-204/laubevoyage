import { getApplicationServices } from '@/application/factory'
import { getBusinessDateString } from '@/lib/date'
import type {
  ExperienceDetailsDTO,
  DepartureSlotDTO,
  ItineraryDayDTO,
  FormattedCommercialBreakdown,
  AccommodationStayDTO,
  AccommodationOptionDTO,
} from './dto-details'
import type { DepartureSlotStatus } from '@/domains/experience/types'
import type { ConvertedPrice } from '@/domains/currency/types'
import { formatExperienceDuration } from '@/domains/experience/duration-formatter'
import { ExperiencePolicy } from '@/domains/experience/policy'
import { AccommodationPolicy } from '@/domains/experience/accommodation-policy'

function requiresExplicitAccommodationSelection(
  accommodations?: any[],
  selectedOptions?: Record<number, string>,
): boolean {
  if (!Array.isArray(accommodations) || accommodations.length === 0) return false

  return accommodations.some((stay: any) => {
    const rawOptions = Array.isArray(stay.options) && stay.options.length > 0
      ? stay.options
      : stay.property || stay.roomRates
        ? [stay]
        : []

    if (rawOptions.length > 1) {
      const selectedId = selectedOptions?.[stay.order]
      if (!selectedId || typeof selectedId !== 'string' || selectedId.trim() === '') {
        return true
      }
      const matchesOption = rawOptions.some((opt: any) => {
        const optId = opt.id ? String(opt.id) : undefined
        return optId === selectedId
      })
      if (!matchesOption) {
        return true
      }
    }
    return false
  })
}

export class ExperienceDetailsLoader {
  static async loadBySlug(
    slugOrId: string,
    options?: {
      locale?: string
      currency?: string
      adults?: number
      selectedAccommodationOptions?: Record<number, string>
    },
  ): Promise<ExperienceDetailsDTO | null> {
    const { experience, localization, destination, bookingPricingUseCase } = await getApplicationServices()
    const ctx = await localization.buildContext({
      cookieLocale: options?.locale,
      cookieCurrency: options?.currency,
    })

    let exp = await experience.getBySlug(slugOrId)
    if (!exp && !isNaN(Number(slugOrId))) {
      exp = await experience.getById(Number(slugOrId))
    }

    if (!exp) return null

    const rawTitle = exp.title

    // Resolve authoritative Origin & Destination Stops from Destination Domain
    const allCityIdsToFetch = Array.from(
      new Set(
        [
          exp.cityId,
          ...(exp.destinations || []),
          ...(exp.itinerary || []).map((d) => d.cityId).filter((id): id is number => typeof id === 'number' && id > 0),
        ].filter((id): id is number => typeof id === 'number' && id > 0),
      ),
    )

    const cityDocsMap = new Map<number, { id: number; name: string; slug: string; countryId: number; countryName: string; countrySlug: string }>()
    if (allCityIdsToFetch.length > 0) {
      const rawCityDocs = await destination.getCitiesByIds(allCityIdsToFetch)
      for (const c of rawCityDocs) {
        const cId = Number(c.id)
        const cName = String(c.name || '')
        const cSlug = String(c.slug || '')
        let countryId = 0
        let countryName = ''
        let countrySlug = ''
        if (c.country && typeof c.country === 'object') {
          countryId = Number(c.country.id)
          countryName = String(c.country.name || '')
          countrySlug = String(c.country.slug || '')
        } else if (c.country) {
          countryId = Number(c.country)
          const cCountryDoc = (await destination.getCountryById(countryId)) as Record<string, any> | null
          if (cCountryDoc) {
            countryName = String(cCountryDoc.name || '')
            countrySlug = String(cCountryDoc.slug || '')
          }
        }
        cityDocsMap.set(cId, { id: cId, name: cName, slug: cSlug, countryId, countryName, countrySlug })
      }
    }

    // Build ordered destination stops list (Origin City + additional destinations)
    const orderedCityIds = Array.from(
      new Set([exp.cityId, ...(exp.destinations || [])].filter((id): id is number => typeof id === 'number' && id > 0)),
    )
    const destinationStops = orderedCityIds
      .map((id) => cityDocsMap.get(id))
      .filter((s): s is NonNullable<typeof s> => s !== undefined)

    const originCity = cityDocsMap.get(exp.cityId)

    // Collect all raw names for translation batch
    const textsToTranslate: string[] = [rawTitle]
    for (const stop of destinationStops) {
      textsToTranslate.push(stop.name)
      if (stop.countryName) textsToTranslate.push(stop.countryName)
    }

    // Dynamic translations for itinerary days
    const rawDays = exp.itinerary || []
    for (const day of rawDays) {
      textsToTranslate.push(day.title)
      textsToTranslate.push(day.description)
    }

    // Dynamic translations for services
    const rawIncluded = exp.included || []
    const rawExcluded = exp.excluded || []
    const servicesToTranslate = [...rawIncluded, ...rawExcluded]
    textsToTranslate.push(...servicesToTranslate)

    const translatedBatch = await localization.translateBatch(textsToTranslate, ctx)
    let batchIdx = 0

    const translatedTitle = translatedBatch[batchIdx++] || rawTitle

    // Map translated destination stops
    const translatedStops = destinationStops.map((stop) => {
      const translatedCityName = translatedBatch[batchIdx++] || stop.name
      const translatedCountryName = stop.countryName ? (translatedBatch[batchIdx++] || stop.countryName) : ''
      return {
        id: stop.id,
        name: translatedCityName,
        slug: stop.slug,
        countryName: translatedCountryName,
        countrySlug: stop.countrySlug,
      }
    })

    // Compute canonical location string
    let locationText = ''
    if (translatedStops.length === 0) {
      locationText = ''
    } else if (translatedStops.length === 1) {
      const single = translatedStops[0]
      locationText = single.countryName ? `${single.name}, ${single.countryName}` : single.name
    } else {
      // Check if all stops belong to the same country
      const distinctCountries = Array.from(new Set(translatedStops.map((s) => s.countryName).filter(Boolean)))
      if (distinctCountries.length <= 1) {
        const cityNames = translatedStops.map((s) => s.name).join(' • ')
        locationText = distinctCountries[0] ? `${cityNames}, ${distinctCountries[0]}` : cityNames
      } else {
        // Multi-country: "City (Country) • City (Country)"
        locationText = translatedStops
          .map((s) => (s.countryName ? `${s.name} (${s.countryName})` : s.name))
          .join(' • ')
      }
    }

    const adultsCount = typeof options?.adults === 'number' && options.adults >= 1 ? options.adults : 2
    const destinationTimezone = await experience.getDestinationTimezone(exp.id)
    const todayStr = getBusinessDateString(destinationTimezone)

    const isSlotLess = exp.type === 'daily_tour' || (exp.type === 'package' && exp.packageMode === 'flexible_date')
    const dbSlots = isSlotLess ? [] : await experience.findSlotsByExperienceId(exp.id)

    // Dynamic translation for description
    const rawDescription = exp.descriptionHtml || ''
    const [translatedDescription] = rawDescription
      ? await localization.translateBatch([rawDescription], ctx)
      : [rawDescription]

    const itinerary: ItineraryDayDTO[] = rawDays.map((day) => {
      const dayTitle = translatedBatch[batchIdx++] || day.title
      const dayDesc = translatedBatch[batchIdx++] || day.description
      let dayLocation: string | undefined = undefined
      if (day.cityId && cityDocsMap.has(day.cityId)) {
        const dayCityDoc = cityDocsMap.get(day.cityId)!
        const translatedMatch = translatedStops.find((s) => s.id === day.cityId)
        dayLocation = translatedMatch ? translatedMatch.name : dayCityDoc.name
      }
      return {
        dayNumber: day.dayNumber,
        title: dayTitle,
        description: dayDesc,
        cityId: day.cityId,
        location: dayLocation,
      }
    })

    const includedServices = rawIncluded.map(() => translatedBatch[batchIdx++] || '')
    const excludedServices = rawExcluded.map(() => translatedBatch[batchIdx++] || '')

    const rawImages = [exp.heroUrl, ...(Array.isArray(exp.gallery) ? exp.gallery : [])]
      .filter((url): url is string => Boolean(url && url.trim().length > 0))
    const images: string[] = Array.from(new Set(rawImages))

    const baseDTO = {
      id: exp.id,
      slug: exp.slug,
      title: translatedTitle,
      subtitle: translatedTitle,
      location: locationText,
      destinations: translatedStops,
      destinationTimezone,
      rating: (exp as any).rating ?? 0,
      reviewsCount: (exp as any).reviewsCount ?? 0,
      initialAdults: adultsCount,
      descriptionHtml: translatedDescription || rawDescription,
      images,
      itinerary,
      includedServices,
      excludedServices,
      policiesHtml: exp.policiesHtml,
    }

    const blackouts = exp.blackouts || []

    // =========================================================================
    // 1. FIXED PACKAGE
    // =========================================================================
    if (exp.type === 'package' && exp.packageMode === 'fixed_date') {
      const now = new Date()
      const todayInTimezone = getBusinessDateString(destinationTimezone, now)

      // Filter upcoming slots (exclude past calendar dates)
      const upcomingSlots = dbSlots.filter((s) => {
        if (!s.date) return false
        if (s.date < todayInTimezone) return false
        return true
      })

      // Map upcoming slots with their authoritative status
      const mappedSlots: DepartureSlotDTO[] = upcomingSlots
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .map((s) => {
          if (!s.id) {
            throw new Error(`[ExperienceDetailsLoader] Departure slot ${s.departureId} is missing canonical ID.`)
          }
          // Determine authoritative status according to capacity and cutoff rules
          const bookableCheck = ExperiencePolicy.isFixedPackageSlotBookable(
            {
              date: s.date,
              startTime: s.startTime || undefined,
              slotStatus: s.status,
              capacityAvailable: s.capacityAvailable,
              timezone: destinationTimezone,
            },
            now,
          )

          let status: DepartureSlotStatus = s.status
          if (s.status === 'available') {
            if (s.capacityAvailable <= 0) {
              status = 'sold_out'
            } else if (!bookableCheck.allowed && bookableCheck.code === 'DEPARTURE_IN_PAST') {
              status = 'past'
            }
          }

          return {
            id: s.id,
            departureId: s.departureId,
            departureDate: s.date,
            startTime: s.startTime || undefined,
            availableSeats: Math.max(0, s.capacityAvailable),
            totalCapacity: s.capacityTotal,
            heldSeats: s.capacityReserved,
            soldSeats: s.capacitySold,
            priceOverrideEGP: s.priceOverrideEGP,
            status,
          }
        })
        .filter((s) => s.status !== 'past')

      // Find the first genuinely bookable slot for default selection
      const bookableSlots = mappedSlots.filter(
        (s) => s.status === 'available' && s.availableSeats > 0,
      )

      const isBookable = exp.availability === 'available' && bookableSlots.length > 0
      let defaultSlot: DepartureSlotDTO | null = null
      let pricing: {
        unitPrice: ConvertedPrice
        totalPrice: ConvertedPrice
        formattedBreakdown?: FormattedCommercialBreakdown
        commercialBreakdown?: any
        availableAllocationOptions?: import('@/domains/experience/room-allocation-policy').RoomAllocationOption[]
        selectedAllocationId?: string
        selectedAccommodationOptions?: Record<number, string>
      } | null = null

      if (isBookable && bookableSlots.length > 0) {
        defaultSlot = bookableSlots[0]

        let authoritativeDefaults: Record<number, string> = {}
        let defaultResolutionError: string | null = null
        try {
          authoritativeDefaults = AccommodationPolicy.resolveAuthoritativeDefaults(
            (exp as any).accommodations,
          )
        } catch (err: any) {
          defaultResolutionError = err.message
        }

        const effectiveAccommodationOptions = {
          ...authoritativeDefaults,
          ...(options?.selectedAccommodationOptions || {}),
        }

        const selectionNeeded =
          defaultResolutionError !== null ||
          requiresExplicitAccommodationSelection(
            (exp as any).accommodations,
            effectiveAccommodationOptions,
          )

        if (defaultSlot && !selectionNeeded) {
          const pricingRes = await bookingPricingUseCase.calculate({
            experienceId: exp.id,
            slotId: defaultSlot.id,
            adultsCount,
            childrenCount: 0,
            selectedAccommodationOptions: effectiveAccommodationOptions,
            ctx,
          })
          pricing = {
            unitPrice: pricingRes.unitPrice,
            totalPrice: pricingRes.totalCost,
            formattedBreakdown: pricingRes.formattedBreakdown,
            commercialBreakdown: pricingRes.commercialBreakdown,
            availableAllocationOptions: pricingRes.availableAllocationOptions,
            selectedAllocationId: pricingRes.selectedAllocationId,
            selectedAccommodationOptions: pricingRes.selectedAccommodationOptions,
          }
        }
      }

      const durationLabels = {
        daySingular: localization.translateUiKey('experience.daySingular', ctx),
        dayPlural: localization.translateUiKey('experience.dayPlural', ctx),
        nightSingular: localization.translateUiKey('experience.nightSingular', ctx),
        nightPlural: localization.translateUiKey('experience.nightPlural', ctx),
        hourSingular: localization.translateUiKey('experience.hourSingular', ctx),
        hourPlural: localization.translateUiKey('experience.hourPlural', ctx),
        minSingular: localization.translateUiKey('experience.minSingular', ctx),
        minPlural: localization.translateUiKey('experience.minPlural', ctx),
      }

      const formattedDuration = formatExperienceDuration(
        {
          type: 'package',
          days: exp.durationDays,
          nights: exp.durationNights,
        },
        durationLabels,
      )

      const OCCUPANCY_KEY_MAP: Record<string, string> = {
        single: 'experience.occupancy.single',
        double: 'experience.occupancy.double',
        triple: 'experience.occupancy.triple',
        quad: 'experience.occupancy.quad',
      }

      const accommodationsDTO: AccommodationStayDTO[] | undefined =
        Array.isArray((exp as any).accommodations) && (exp as any).accommodations.length > 0
          ? await Promise.all(
              (exp as any).accommodations.map(async (stay: any) => {
                const rawOptions = Array.isArray(stay.options) && stay.options.length > 0
                  ? stay.options
                  : stay.property || stay.roomRates
                    ? [stay] // fallback adapter
                    : []

                const mappedOptions: AccommodationOptionDTO[] = await Promise.all(
                  rawOptions.map(async (opt: any, optIdx: number) => {
                    const prop = typeof opt.property === 'object' && opt.property !== null ? opt.property : {}
                    const optId = opt.id ? String(opt.id) : `stay-${stay.order}-opt-${optIdx + 1}`
                    const propId = typeof opt.property === 'object' && opt.property?.id
                      ? Number(opt.property.id)
                      : typeof opt.propertyId === 'number'
                        ? opt.propertyId
                        : Number(opt.property) || optIdx + 1
                    const propName = prop.name || opt.propertyName || `Accommodation #${propId}`
                    const propType = prop.type || opt.propertyType || 'hotel'

                    return {
                      id: optId,
                      propertyId: propId,
                      propertyName: propName,
                      propertyType: propType,
                      rating: typeof prop.rating === 'number' ? prop.rating : undefined,
                      heroUrl: prop.heroUrl || undefined,
                      roomCategory: opt.roomCategory || undefined,
                      boardBasis: opt.boardBasis || undefined,
                      isDefault: Boolean(opt.isDefault),
                      pricingUnit: (opt.pricingUnit === 'per_night' ? 'per_night' : 'per_stay') as
                        | 'per_stay'
                        | 'per_night',
                      roomRates: await Promise.all(
                        (opt.roomRates || []).map(async (rateObj: any) => ({
                          occupancy: rateObj.occupancy,
                          label: OCCUPANCY_KEY_MAP[rateObj.occupancy]
                            ? localization.translateUiKey(OCCUPANCY_KEY_MAP[rateObj.occupancy], ctx)
                            : rateObj.occupancy,
                          rateEGP: Number(rateObj.rateEGP || 0),
                          ratePrice: await localization.formatPrice(Number(rateObj.rateEGP || 0), ctx),
                          enabled: rateObj.enabled !== false,
                        })),
                      ),
                    }
                  }),
                )

                return {
                  order: stay.order,
                  nights: stay.nights,
                  options: mappedOptions,
                }
              }),
            )
          : undefined

      const baseAdultPriceEGP = (pricing?.unitPrice?.baseAmountEGP ?? exp.price) || 0
      const sharingPct = (exp as any).childPolicy?.childSharingBedPercentage ?? 50
      const extraBedPct = (exp as any).childPolicy?.childExtraBedPercentage ?? 75

      const childPolicyDTO = (exp as any).childPolicy
        ? {
            childrenAllowed: (exp as any).childPolicy.childrenAllowed !== false,
            childSharingBedPercentage: sharingPct,
            childExtraBedPercentage: extraBedPct,
            childSharingPrice: await localization.formatPrice(
              Math.round(baseAdultPriceEGP * (sharingPct / 100)),
              ctx,
            ),
            childExtraBedPrice: await localization.formatPrice(
              Math.round(baseAdultPriceEGP * (extraBedPct / 100)),
              ctx,
            ),
          }
        : undefined

      return {
        ...baseDTO,
        type: 'package' as const,
        packageMode: 'fixed_date' as const,
        bookability: {
          model: 'fixed_package' as const,
          isBookable,
          departureSlots: mappedSlots,
          defaultSlotId: defaultSlot?.id || null,
        },
        durationDays: exp.durationDays,
        durationNights: exp.durationNights,
        formattedDuration,
        departureSlots: mappedSlots,
        defaultSlotId: defaultSlot?.id || null,
        blackouts,
        accommodations: accommodationsDTO,
        childPolicy: childPolicyDTO,
        pricing,
      }
    }

    // =========================================================================
    // 2. FLEXIBLE PACKAGE
    // =========================================================================
    if (exp.type === 'package' && exp.packageMode === 'flexible_date') {
      const firstStartDate = ExperiencePolicy.findFirstBookableFlexibleStartDate({
        durationDays: exp.durationDays,
        blackouts,
        timezone: destinationTimezone,
      })

      const isBookable = exp.availability === 'available' && firstStartDate !== null
      const initialStartDate = firstStartDate || todayStr
      const minStartDate = firstStartDate || todayStr

      let pricing: {
        unitPrice: ConvertedPrice
        totalPrice: ConvertedPrice
        formattedBreakdown?: FormattedCommercialBreakdown
        commercialBreakdown?: any
        availableAllocationOptions?: import('@/domains/experience/room-allocation-policy').RoomAllocationOption[]
        selectedAllocationId?: string
        selectedAccommodationOptions?: Record<number, string>
      } | null = null

      let authoritativeDefaults: Record<number, string> = {}
      let defaultResolutionError: string | null = null
      try {
        authoritativeDefaults = AccommodationPolicy.resolveAuthoritativeDefaults(
          (exp as any).accommodations,
        )
      } catch (err: any) {
        defaultResolutionError = err.message
      }

      const effectiveAccommodationOptions = {
        ...authoritativeDefaults,
        ...(options?.selectedAccommodationOptions || {}),
      }

      const selectionNeeded =
        defaultResolutionError !== null ||
        requiresExplicitAccommodationSelection(
          (exp as any).accommodations,
          effectiveAccommodationOptions,
        )

      if (isBookable && firstStartDate && !selectionNeeded) {
        const pricingRes = await bookingPricingUseCase.calculatePreview({
          experienceId: exp.id,
          date: firstStartDate,
          startTime: '',
          adultsCount,
          childrenCount: 0,
          selectedAccommodationOptions: effectiveAccommodationOptions,
          ctx,
        })
        pricing = {
          unitPrice: pricingRes.unitPrice,
          totalPrice: pricingRes.totalCost,
          formattedBreakdown: pricingRes.formattedBreakdown,
          commercialBreakdown: pricingRes.commercialBreakdown,
          availableAllocationOptions: pricingRes.availableAllocationOptions,
          selectedAllocationId: pricingRes.selectedAllocationId,
          selectedAccommodationOptions: pricingRes.selectedAccommodationOptions,
        }
      }

      const durationLabels = {
        daySingular: localization.translateUiKey('experience.daySingular', ctx),
        dayPlural: localization.translateUiKey('experience.dayPlural', ctx),
        nightSingular: localization.translateUiKey('experience.nightSingular', ctx),
        nightPlural: localization.translateUiKey('experience.nightPlural', ctx),
        hourSingular: localization.translateUiKey('experience.hourSingular', ctx),
        hourPlural: localization.translateUiKey('experience.hourPlural', ctx),
        minSingular: localization.translateUiKey('experience.minSingular', ctx),
        minPlural: localization.translateUiKey('experience.minPlural', ctx),
      }

      const formattedDuration = formatExperienceDuration(
        {
          type: 'package',
          days: exp.durationDays,
          nights: exp.durationNights,
        },
        durationLabels,
      )

      const OCCUPANCY_KEY_MAP: Record<string, string> = {
        single: 'experience.occupancy.single',
        double: 'experience.occupancy.double',
        triple: 'experience.occupancy.triple',
        quad: 'experience.occupancy.quad',
      }

      const accommodationsDTO: AccommodationStayDTO[] | undefined =
        Array.isArray((exp as any).accommodations) && (exp as any).accommodations.length > 0
          ? await Promise.all(
              (exp as any).accommodations.map(async (stay: any) => {
                const rawOptions = Array.isArray(stay.options) && stay.options.length > 0
                  ? stay.options
                  : stay.property || stay.roomRates
                    ? [stay] // fallback adapter
                    : []

                const mappedOptions: AccommodationOptionDTO[] = await Promise.all(
                  rawOptions.map(async (opt: any, optIdx: number) => {
                    const prop = typeof opt.property === 'object' && opt.property !== null ? opt.property : {}
                    const optId = opt.id ? String(opt.id) : `stay-${stay.order}-opt-${optIdx + 1}`
                    const propId = typeof opt.property === 'object' && opt.property?.id
                      ? Number(opt.property.id)
                      : typeof opt.propertyId === 'number'
                        ? opt.propertyId
                        : Number(opt.property) || optIdx + 1
                    const propName = prop.name || opt.propertyName || `Accommodation #${propId}`
                    const propType = prop.type || opt.propertyType || 'hotel'

                    return {
                      id: optId,
                      propertyId: propId,
                      propertyName: propName,
                      propertyType: propType,
                      rating: typeof prop.rating === 'number' ? prop.rating : undefined,
                      heroUrl: prop.heroUrl || undefined,
                      roomCategory: opt.roomCategory || undefined,
                      boardBasis: opt.boardBasis || undefined,
                      isDefault: Boolean(opt.isDefault),
                      pricingUnit: (opt.pricingUnit === 'per_night' ? 'per_night' : 'per_stay') as
                        | 'per_stay'
                        | 'per_night',
                      roomRates: await Promise.all(
                        (opt.roomRates || []).map(async (rateObj: any) => ({
                          occupancy: rateObj.occupancy,
                          label: OCCUPANCY_KEY_MAP[rateObj.occupancy]
                            ? localization.translateUiKey(OCCUPANCY_KEY_MAP[rateObj.occupancy], ctx)
                            : rateObj.occupancy,
                          rateEGP: Number(rateObj.rateEGP || 0),
                          ratePrice: await localization.formatPrice(Number(rateObj.rateEGP || 0), ctx),
                          enabled: rateObj.enabled !== false,
                        })),
                      ),
                    }
                  }),
                )

                return {
                  order: stay.order,
                  nights: stay.nights,
                  options: mappedOptions,
                }
              }),
            )
          : undefined

      const baseAdultPriceEGP = (pricing?.unitPrice?.baseAmountEGP ?? exp.price) || 0
      const sharingPct = (exp as any).childPolicy?.childSharingBedPercentage ?? 50
      const extraBedPct = (exp as any).childPolicy?.childExtraBedPercentage ?? 75

      const childPolicyDTO = (exp as any).childPolicy
        ? {
            childrenAllowed: (exp as any).childPolicy.childrenAllowed !== false,
            childSharingBedPercentage: sharingPct,
            childExtraBedPercentage: extraBedPct,
            childSharingPrice: await localization.formatPrice(
              Math.round(baseAdultPriceEGP * (sharingPct / 100)),
              ctx,
            ),
            childExtraBedPrice: await localization.formatPrice(
              Math.round(baseAdultPriceEGP * (extraBedPct / 100)),
              ctx,
            ),
          }
        : undefined

      return {
        ...baseDTO,
        type: 'package' as const,
        packageMode: 'flexible_date' as const,
        bookability: {
          model: 'flexible_package' as const,
          isBookable,
          initialSuggestedStartDate: initialStartDate,
          minStartDate,
          durationDays: exp.durationDays,
          durationNights: exp.durationNights,
          blackouts,
        },
        durationDays: exp.durationDays,
        durationNights: exp.durationNights,
        formattedDuration,
        departureSlots: [],
        defaultSlotId: null,
        blackouts,
        accommodations: accommodationsDTO,
        childPolicy: childPolicyDTO,
        pricing,
      }
    }

    // =========================================================================
    // 3. DAILY TOUR
    // =========================================================================
    const tourDurationMinutes = exp.type === 'daily_tour' ? exp.durationMinutes : 60
    const schedules = exp.schedules || []
    const firstDeparture = ExperiencePolicy.findFirstBookableDailyTourDeparture({
      schedules,
      durationMinutes: tourDurationMinutes,
      blackouts,
      timezone: destinationTimezone,
    })

    const isBookable = exp.availability === 'available' && firstDeparture !== null
    let pricing: { unitPrice: ConvertedPrice; totalPrice: ConvertedPrice; formattedBreakdown?: FormattedCommercialBreakdown; commercialBreakdown?: any } | null = null

    if (isBookable && firstDeparture) {
      const pricingRes = await bookingPricingUseCase.calculatePreview({
        experienceId: exp.id,
        date: firstDeparture.date,
        startTime: firstDeparture.startTime,
        adultsCount,
        childrenCount: 0,
        ctx,
      })
      pricing = {
        unitPrice: pricingRes.unitPrice,
        totalPrice: pricingRes.totalCost,
        formattedBreakdown: pricingRes.formattedBreakdown,
        commercialBreakdown: pricingRes.commercialBreakdown,
      }
    }

    const durationLabels = {
      daySingular: localization.translateUiKey('experience.daySingular', ctx),
      dayPlural: localization.translateUiKey('experience.dayPlural', ctx),
      nightSingular: localization.translateUiKey('experience.nightSingular', ctx),
      nightPlural: localization.translateUiKey('experience.nightPlural', ctx),
      hourSingular: localization.translateUiKey('experience.hourSingular', ctx),
      hourPlural: localization.translateUiKey('experience.hourPlural', ctx),
      minSingular: localization.translateUiKey('experience.minSingular', ctx),
      minPlural: localization.translateUiKey('experience.minPlural', ctx),
    }

    const formattedDuration = formatExperienceDuration(
      {
        type: 'daily_tour',
        durationMinutes: tourDurationMinutes,
      },
      durationLabels,
    )

    return {
      ...baseDTO,
      type: 'daily_tour' as const,
      bookability: {
        model: 'daily_tour' as const,
        isBookable,
        initialSuggestedDate: firstDeparture?.date || null,
        initialSuggestedTime: firstDeparture?.startTime || null,
        minDate: firstDeparture?.date || todayStr,
        durationMinutes: tourDurationMinutes,
        schedules,
        blackouts,
      },
      departureSlots: [],
      defaultSlotId: null,
      durationMinutes: tourDurationMinutes,
      formattedDuration,
      schedules,
      blackouts,
      pricing,
    }
  }
}
