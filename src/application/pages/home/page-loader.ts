import { getDomainServices } from '@/domains/factory'
import { getBusinessDateString } from '@/lib/date'
import type { HomeDTO } from './dto'

export class HomePageLoader {
  static async load(params?: { locale?: string; currency?: string }): Promise<HomeDTO> {
    try {
      const { destination, localization, experience } = await getDomainServices()
      const ctx = localization.buildContext({
        cookieLocale: params?.locale,
        cookieCurrency: params?.currency,
      })

      const overview = await destination.getHomePageOverview(ctx.currency)

      // Collect all raw texts for 1 Single Batch Request
      const rawTexts: string[] = []

      for (const doc of overview.featuredExperiences || []) {
        if (doc.title) rawTexts.push(doc.title)
        const sub = (doc as any).subtitle
        if (sub) rawTexts.push(sub)
      }

      for (const doc of overview.topCountries || []) {
        if (doc.name) rawTexts.push(doc.name)
      }

      const translatedTexts = await localization.translateBatch(rawTexts, ctx)
      let textIdx = 0

      const todayStr = getBusinessDateString(ctx.timezone)

      const featuredExperiences = await Promise.all(
        (overview.featuredExperiences || []).map(async (doc: any) => {
          const basePriceEGP = await experience.resolveStartingPrice(Number(doc.id), todayStr)
          const pricingResult = await localization.formatPrice(basePriceEGP, ctx)
          const translatedTitle = doc.title ? (translatedTexts[textIdx++] || String(doc.title)) : ''
          const translatedSubtitle = doc.subtitle ? (translatedTexts[textIdx++] || String(doc.subtitle)) : ''

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
            price: pricingResult,
          }
        }),
      )

      const topDestinations = (overview.topCountries || []).map((doc: any) => {
        const translatedCountryName = doc.name ? (translatedTexts[textIdx++] || String(doc.name)) : ''
        return {
          id: Number(doc.id),
          countryName: translatedCountryName,
          cityName: translatedCountryName,
          countrySlug: doc.slug || '',
          citySlug: doc.slug || '',
          imageUrl: doc.bannerImage?.url || '',
          experiencesCount: doc.experiencesCount || 0,
        }
      })

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
