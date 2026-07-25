import { getDomainServices } from '@/domains/factory'
import { getBusinessDateString } from '@/lib/date'
import type { ExperienceDetailsDTO } from './dto-details'

export class ExperienceDetailsLoader {
  static async loadBySlug(
    slugOrId: string,
    options?: { locale?: string; currency?: string; adults?: number },
  ): Promise<ExperienceDetailsDTO | null> {
    try {
      const { experience, localization, bookingPricingUseCase } = await getDomainServices()
      const ctx = localization.buildContext({
        language: (options?.locale || 'en') as any,
        currency: (options?.currency || 'EGP') as any,
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

      const descTag = localization.translateUiKey('experience.details.descTag', ctx) || 'Experience luxury journeys, curated itineraries, and unforgettable private tours across Egypt.'
      const day1Title = localization.translateUiKey('experience.details.day1Title', ctx) || 'Arrival & Welcome Reception'
      const day1Desc = localization.translateUiKey('experience.details.day1Desc', ctx) || 'Meet & assist upon arrival, transfer to luxury accommodation with VIP welcome drink.'
      const day2Title = localization.translateUiKey('experience.details.day2Title', ctx) || 'Guided Excursion & Cultural Journey'
      const day2Desc = localization.translateUiKey('experience.details.day2Desc', ctx) || 'Explore iconic ancient landmarks with expert Egyptologist guide and luxury private transport.'

      const inc1 = localization.translateUiKey('experience.details.inc1', ctx) || 'VIP Private Transfers'
      const inc2 = localization.translateUiKey('experience.details.inc2', ctx) || '5-Star Luxury Accommodation'
      const inc3 = localization.translateUiKey('experience.details.inc3', ctx) || 'Expert Egyptologist Guide'
      const exc1 = localization.translateUiKey('experience.details.exc1', ctx) || 'International Airfare'
      const exc2 = localization.translateUiKey('experience.details.exc2', ctx) || 'Personal Expenses & Tipping'

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

      return {
        id: Number(item.id),
        slug: item.slug || String(item.id),
        title: translatedTitle || rawTitle,
        subtitle: translatedTitle || rawTitle,
        type: (item.type || 'package') as 'package' | 'daily_tour',
        location: translatedLocation || locationText,
        durationDays: item.durationDays || 1,
        rating: item.rating || 5,
        reviewsCount: item.reviewsCount || 12,
        initialAdults: adultsCount,
        descriptionHtml: `<p>${translatedTitle || rawTitle} - ${descTag}</p>`,
        images: item.heroUrl ? [item.heroUrl] : ['/images/hero-bg.jpg'],
        itinerary: [
          {
            dayNumber: 1,
            title: day1Title,
            description: day1Desc,
          },
          {
            dayNumber: 2,
            title: day2Title,
            description: day2Desc,
          },
        ],
        departureSlots,
        includedServices: [inc1, inc2, inc3],
        excludedServices: [exc1, exc2],
        pricing: {
          unitPrice: pricingRes.unitPrice,
          totalPrice: pricingRes.totalCost,
        },
      }
    } catch (err: unknown) {
      console.error('[ExperienceDetailsLoader] Error loading details:', err)
      return null
    }
  }
}
