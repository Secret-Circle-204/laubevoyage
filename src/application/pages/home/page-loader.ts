import { getDomainServices } from '@/domains/factory'
import type { HomeDTO } from './dto'

export class HomePageLoader {
  static async load(params?: { locale?: string; currency?: string }): Promise<HomeDTO> {
    const locale = params?.locale || 'en'
    const currency = params?.currency || 'EGP'

    try {
      const { destination, localization } = await getDomainServices()
      const ctx = localization.buildContext({ language: locale as any, currency: currency as any })

      const overview = await destination.getHomePageOverview(currency)

      const featuredExperiences = await Promise.all(
        (overview.featuredExperiences || []).map(async (doc: any) => {
          const rawPriceEGP = doc.basePriceEGP || 0
          const pricingResult = await localization.formatPrice(rawPriceEGP, ctx)
          const translatedTitle = await localization.translateText(doc.title || '', ctx)
          const translatedSubtitle = await localization.translateText(doc.subtitle || '', ctx)

          return {
            id: Number(doc.id),
            slug: doc.slug || '',
            title: translatedTitle,
            subtitle: translatedSubtitle,
            type: (doc.type || 'package') as 'package' | 'daily_tour',
            imageUrl: doc.featuredImage?.url || '',
            location: doc.city?.name || '',
            durationDays: doc.durationDays || 1,
            rating: doc.rating || 0,
            reviewsCount: doc.reviewsCount || 0,
            price: {
              amountEGP: rawPriceEGP,
              displayAmount: pricingResult.displayAmount,
              displayCurrency: pricingResult.displayCurrency,
              formatted: pricingResult.formatted,
            },
          }
        }),
      )

      const topDestinations = await Promise.all(
        (overview.topCountries || []).map(async (doc: any) => {
          const translatedCountryName = await localization.translateText(doc.name || '', ctx)
          return {
            id: Number(doc.id),
            countryName: translatedCountryName,
            cityName: translatedCountryName,
            countrySlug: doc.slug || '',
            citySlug: doc.slug || '',
            imageUrl: doc.bannerImage?.url || '',
            experiencesCount: doc.experiencesCount || 0,
          }
        }),
      )

      return {
        hero: {
          title: localization.translateUiKey('hero.title', ctx),
          subtitle: localization.translateUiKey('hero.subtitle', ctx),
          ctaExploreText: localization.translateUiKey('hero.cta.primary', ctx),
          ctaDiscoverText: localization.translateUiKey('hero.cta.secondary', ctx),
          backgroundImageUrl: '',
        },
        featuredExperiences,
        topDestinations,
        stats: {
          happyTravelers: 12500,
          destinationsCount: topDestinations.length,
          toursCompleted: featuredExperiences.length,
          satisfactionRate: 99,
        },
      }
    } catch (err: unknown) {
      console.error('[HomePageLoader] Failure loading home page overview:', err)
      throw err
    }
  }
}
