import { getDomainServices } from '@/domains/factory'
import type { ExperienceDetailsDTO } from './dto-details'

export class ExperienceDetailsLoader {
  static async loadBySlug(slug: string): Promise<ExperienceDetailsDTO | null> {
    try {
      const { experience } = await getDomainServices()
      const results = await experience.search({})
      const exp = results.find((e) => e.slug === slug)
      if (!exp) return null

      return {
        id: Number(exp.id),
        slug: exp.slug,
        title: exp.title || '',
        subtitle: exp.title || '',
        type: (exp.type || 'package') as 'package' | 'daily_tour',
        location: '',
        durationDays: exp.durationDays || 1,
        rating: 0,
        reviewsCount: 0,
        basePrice: {
          amountEGP: exp.basePriceEGP || 0,
          displayAmount: exp.basePriceEGP || 0,
          displayCurrency: 'EGP',
        },
        descriptionHtml: exp.title || '',
        images: [],
        itinerary: [],
        departureSlots: [],
        includedServices: [],
        excludedServices: [],
      }
    } catch {
      return null
    }
  }
}
