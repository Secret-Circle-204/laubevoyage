import { getApplicationServices } from '@/application/factory'
import { getBusinessDateString } from '@/lib/date'
import type { ExperienceDetailsDTO, DepartureSlotDTO, ItineraryDayDTO, FormattedCommercialBreakdown } from './dto-details'
import type { DepartureSlotStatus } from '@/domains/experience/types'
import type { ConvertedPrice } from '@/domains/currency/types'
import { formatExperienceDuration } from '@/domains/experience/duration-formatter'
import { ExperiencePolicy } from '@/domains/experience/policy'

export class ExperienceDetailsLoader {
  static async loadBySlug(
    slugOrId: string,
    options?: { locale?: string; currency?: string; adults?: number },
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

    // Resolve authoritative City & Country from Destination Domain
    let locationText = ''
    if (exp.cityId) {
      const cityDoc = (await destination.getCityById(exp.cityId)) as Record<string, any> | null
      if (cityDoc) {
        const cityName = String(cityDoc.name || '')
        let countryName = ''
        if (cityDoc.country && typeof cityDoc.country === 'object' && cityDoc.country.name) {
          countryName = String(cityDoc.country.name)
        } else if (cityDoc.country) {
          const countryDoc = (await destination.getCountryById(Number(cityDoc.country))) as Record<string, any> | null
          if (countryDoc) countryName = String(countryDoc.name || '')
        }
        locationText = cityName && countryName ? `${cityName}, ${countryName}` : (cityName || countryName)
      }
    }

    const adultsCount = typeof options?.adults === 'number' && options.adults >= 1 ? options.adults : 2

    const textsToTranslate: string[] = [rawTitle]
    if (locationText) {
      textsToTranslate.push(locationText)
    }

    const translatedBatch = await localization.translateBatch(textsToTranslate, ctx)
    const translatedTitle = translatedBatch[0] || rawTitle
    const translatedLocation = locationText ? (translatedBatch[1] || locationText) : ''

    const destinationTimezone = await experience.getDestinationTimezone(exp.id)
    const todayStr = getBusinessDateString(destinationTimezone)

    const isSlotLess = exp.type === 'daily_tour' || (exp.type === 'package' && exp.packageMode === 'flexible_date')
    const dbSlots = isSlotLess ? [] : await experience.findSlotsByExperienceId(exp.id)

    // Dynamic translation for description
    const rawDescription = exp.descriptionHtml || ''
    const [translatedDescription] = rawDescription
      ? await localization.translateBatch([rawDescription], ctx)
      : [rawDescription]

    // Dynamic translations for itinerary days
    const rawDays = exp.itinerary || []
    const dayTextsToTranslate: string[] = []
    for (const day of rawDays) {
      dayTextsToTranslate.push(day.title)
      dayTextsToTranslate.push(day.description)
    }
    
    const translatedDayTexts = dayTextsToTranslate.length > 0 
      ? await localization.translateBatch(dayTextsToTranslate, ctx) 
      : []

    const itinerary: ItineraryDayDTO[] = rawDays.map((day, idx) => {
      const titleIndex = idx * 2
      const descIndex = idx * 2 + 1
      return {
        dayNumber: day.dayNumber,
        title: translatedDayTexts[titleIndex] || day.title,
        description: translatedDayTexts[descIndex] || day.description,
      }
    })

    // Dynamic translations for services
    const rawIncluded = exp.included || []
    const rawExcluded = exp.excluded || []
    const servicesToTranslate = [...rawIncluded, ...rawExcluded]
    const translatedServices = servicesToTranslate.length > 0
      ? await localization.translateBatch(servicesToTranslate, ctx)
      : []
    const includedServices = translatedServices.slice(0, rawIncluded.length)
    const excludedServices = translatedServices.slice(rawIncluded.length)

    const images: string[] = Array.isArray(exp.gallery) && exp.gallery.length > 0
      ? exp.gallery
      : (exp.heroUrl ? [exp.heroUrl] : [])

    const baseDTO = {
      id: exp.id,
      slug: exp.slug,
      title: translatedTitle,
      subtitle: translatedTitle,
      location: translatedLocation,
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
      let pricing: { unitPrice: ConvertedPrice; totalPrice: ConvertedPrice; formattedBreakdown?: FormattedCommercialBreakdown; commercialBreakdown?: any } | null = null

      if (isBookable && bookableSlots.length > 0) {
        defaultSlot = bookableSlots[0]

        if (defaultSlot) {
          const pricingRes = await bookingPricingUseCase.calculate({
            experienceId: exp.id,
            slotId: defaultSlot.id,
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

      const accommodationsDTO =
        Array.isArray((exp as any).accommodations) && (exp as any).accommodations.length > 0
          ? await Promise.all(
              (exp as any).accommodations.map(async (stay: any) => ({
                order: stay.order,
                propertyName: stay.property?.name || `Accommodation #${stay.order}`,
                propertyType: stay.property?.type || 'hotel',
                nights: stay.nights,
                roomCategory: stay.roomCategory || undefined,
                boardBasis: stay.boardBasis || undefined,
                occupancyOptions: await Promise.all(
                  (stay.occupancyOptions || []).map(async (opt: any) => ({
                    occupancy: opt.occupancy,
                    label: OCCUPANCY_KEY_MAP[opt.occupancy]
                      ? localization.translateUiKey(OCCUPANCY_KEY_MAP[opt.occupancy], ctx)
                      : opt.occupancy,
                    supplementEGP: opt.supplementEGP || 0,
                    supplementPrice: await localization.formatPrice(opt.supplementEGP || 0, ctx),
                    isDefault: opt.isDefault || false,
                  })),
                ),
              })),
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

      let pricing: { unitPrice: ConvertedPrice; totalPrice: ConvertedPrice; formattedBreakdown?: FormattedCommercialBreakdown; commercialBreakdown?: any } | null = null
      if (isBookable && firstStartDate) {
        const pricingRes = await bookingPricingUseCase.calculatePreview({
          experienceId: exp.id,
          date: firstStartDate,
          startTime: '',
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

      const accommodationsDTO =
        Array.isArray((exp as any).accommodations) && (exp as any).accommodations.length > 0
          ? await Promise.all(
              (exp as any).accommodations.map(async (stay: any) => ({
                order: stay.order,
                propertyName: stay.property?.name || `Accommodation #${stay.order}`,
                propertyType: stay.property?.type || 'hotel',
                nights: stay.nights,
                roomCategory: stay.roomCategory || undefined,
                boardBasis: stay.boardBasis || undefined,
                occupancyOptions: await Promise.all(
                  (stay.occupancyOptions || []).map(async (opt: any) => ({
                    occupancy: opt.occupancy,
                    label: OCCUPANCY_KEY_MAP[opt.occupancy]
                      ? localization.translateUiKey(OCCUPANCY_KEY_MAP[opt.occupancy], ctx)
                      : opt.occupancy,
                    supplementEGP: opt.supplementEGP || 0,
                    supplementPrice: await localization.formatPrice(opt.supplementEGP || 0, ctx),
                    isDefault: opt.isDefault || false,
                  })),
                ),
              })),
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
