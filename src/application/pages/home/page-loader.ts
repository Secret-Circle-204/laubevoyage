import { getDomainServices } from '@/domains/factory'
import type { HomeDTO } from './dto'

export class HomePageLoader {
  static async load(params?: { locale?: string; currency?: string }): Promise<HomeDTO> {
    const currency = params?.currency || 'EGP'

    try {
      const { destination } = await getDomainServices()
      const overview = await destination.getHomePageOverview(currency)

      const featuredExperiences = (overview.featuredExperiences || []).map((doc: any) => ({
        id: Number(doc.id),
        slug: doc.slug || '',
        title: doc.title || '',
        subtitle: doc.subtitle || '',
        type: (doc.type || 'package') as 'package' | 'daily_tour',
        imageUrl: doc.featuredImage?.url || '',
        location: doc.city?.name || '',
        durationDays: doc.durationDays || 1,
        rating: doc.rating || 0,
        reviewsCount: doc.reviewsCount || 0,
        price: {
          amountEGP: doc.basePriceEGP || 0,
          displayAmount: doc.basePriceEGP || 0,
          displayCurrency: currency,
        },
      }))

      const topDestinations = (overview.topCountries || []).map((doc: any) => ({
        id: Number(doc.id),
        countryName: doc.name || '',
        cityName: doc.name || '',
        countrySlug: doc.slug || '',
        citySlug: doc.slug || '',
        imageUrl: doc.bannerImage?.url || '',
        experiencesCount: doc.experiencesCount || 0,
      }))

      return {
        hero: {
          title: '',
          subtitle: '',
          backgroundImageUrl: '',
        },
        featuredExperiences,
        topDestinations,
        stats: {
          happyTravelers: 0,
          destinationsCount: topDestinations.length,
          toursCompleted: featuredExperiences.length,
          satisfactionRate: 100,
        },
      }
    } catch (err: unknown) {
      console.error('[HomePageLoader] Failure loading home page overview:', err)
      return {
        hero: {
          title: '',
          subtitle: '',
          backgroundImageUrl: '',
        },
        featuredExperiences: [],
        topDestinations: [],
        stats: {
          happyTravelers: 0,
          destinationsCount: 0,
          toursCompleted: 0,
          satisfactionRate: 0,
        },
      }
    }
  }
}
