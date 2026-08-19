import { getApplicationServices } from '@/application/factory'
import { getBusinessDateString } from '@/lib/date'
import type { ExperienceDetailsDTO } from './dto-details'

export class ExperienceDetailsLoader {
  static async loadBySlug(
    slugOrId: string,
    options?: { locale?: string; currency?: string; adults?: number },
  ): Promise<ExperienceDetailsDTO | null> {
    const { experience, localization, bookingPricingUseCase } = await getApplicationServices()
    const ctx = await localization.buildContext({
      cookieLocale: options?.locale,
      cookieCurrency: options?.currency,
    })

    let exp = await experience.getBySlug(slugOrId)
    if (!exp && !isNaN(Number(slugOrId))) {
      exp = await experience.getById(Number(slugOrId))
    }

    if (!exp) {
      const results = await experience.search({})
      exp = results.find((e) => e.slug === slugOrId || String(e.id) === slugOrId) || null
    }

    if (!exp) return null

    const item = exp as Record<string, any>
    const rawTitle = item.title || ''
    const adultsCount = options?.adults !== undefined ? options.adults : 2
    const locationText = item.cityName ? `${item.cityName}, ${item.countryName}` : 'Egypt'

    const [translatedTitle, translatedLocation] = await localization.translateBatch([rawTitle, locationText], ctx)

    const dbSlots = await experience.findSlotsByExperienceId(exp.id)
    const departureSlots = dbSlots.map((s) => ({
      id: s.id || 1,
      departureDate: s.date,
      availableSeats: s.capacityAvailable,
      status: s.status === 'available' ? 'available' as const : 'sold_out' as const,
    }))

    // Resolve default slot through Experience Domain Policy
    const todayStr = getBusinessDateString(ctx.timezone)
    const defaultSlot = experience.resolveDefaultSlot(dbSlots, todayStr)

    // Resolve initial pricing state through single BookingPricingUseCase. Let any error bubble up.
    const pricingRes = await bookingPricingUseCase.calculate({
      experienceId: exp.id,
      slotId: defaultSlot?.id || undefined,
      adultsCount,
      childrenCount: 0,
      ctx,
    })

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

    let dayTextIdx = 0
    const itinerary = rawDays.map((day) => {
      const title = translatedDayTexts[dayTextIdx++] || day.title
      const description = translatedDayTexts[dayTextIdx++] || day.description
      return {
        dayNumber: day.dayNumber,
        title,
        description,
      }
    })

    // Dynamic translations for inclusions/exclusions
    const rawInclusions = exp.included || []
    const rawExclusions = exp.excluded || []
    const servicesToTranslate = [...rawInclusions, ...rawExclusions]
    const translatedServices = servicesToTranslate.length > 0
      ? await localization.translateBatch(servicesToTranslate, ctx)
      : []
    
    const includedServices = translatedServices.slice(0, rawInclusions.length)
    const excludedServices = translatedServices.slice(rawInclusions.length)

    // Dynamic translation for description
    const rawDescription = exp.descriptionHtml || ''
    const [translatedDescription] = rawDescription
      ? await localization.translateBatch([rawDescription], ctx)
      : [rawDescription]

    // Dynamic images from gallery
    const images = Array.isArray(exp.gallery) && exp.gallery.length > 0
      ? exp.gallery
      : (exp.heroUrl ? [exp.heroUrl] : ['/images/hero-bg.jpg'])

    return {
      id: Number(item.id),
      slug: item.slug || String(item.id),
      title: translatedTitle || rawTitle,
      subtitle: translatedTitle || rawTitle,
      type: (item.type || 'package') as 'package' | 'daily_tour',
      location: translatedLocation || locationText,
      durationDays: item.durationDays || 1,
      rating: item.rating || 5,
      reviewsCount: item.reviewsCount ?? 0,
      initialAdults: adultsCount,
      descriptionHtml: translatedDescription || rawDescription,
      images,
      itinerary,
      departureSlots,
      includedServices,
      excludedServices,
      pricing: {
        unitPrice: pricingRes.unitPrice,
        totalPrice: pricingRes.totalCost,
      },
    }
  }
}
