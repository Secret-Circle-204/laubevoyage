import { getDomainServices } from '@/domains/factory'
import { getBusinessDateString } from '@/lib/date'
import type { LocaleContext } from '@/types/locale'
import type { HomeDTO } from './dto'

export class HomePageLoader {
  static async load(ctx: LocaleContext): Promise<HomeDTO> {
    console.log(`[HomePageLoader.load] called with currency = "${ctx.currency}", requestContextId = "${ctx.requestContextId || ''}"`)
    try {
      const { destination, localization, experience } = await getDomainServices()
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

          const expHeroUrl = doc.hero && typeof doc.hero === 'object' && doc.hero.url
            ? doc.hero.url
            : (typeof doc.hero === 'string' ? doc.hero : '')

          const durationDaysRaw = doc.duration && typeof doc.duration === 'object' && doc.duration.days !== undefined
            ? doc.duration.days
            : doc.durationDays
          const durationDays = typeof durationDaysRaw === 'number' && durationDaysRaw >= 1
            ? durationDaysRaw
            : (Number(durationDaysRaw) || 1)

          return {
            id: Number(doc.id),
            slug: doc.slug,
            title: translatedTitle,
            subtitle: translatedSubtitle,
            type: (doc.type === 'daily_tour' ? 'daily_tour' : 'package') as 'package' | 'daily_tour',
            imageUrl: expHeroUrl,
            location: doc.city?.name || '',
            durationDays,
            rating: typeof doc.rating === 'number' ? doc.rating : 0,
            reviewsCount: typeof doc.reviewsCount === 'number' ? doc.reviewsCount : 0,
            price: pricingResult,
          }
        }),
      )

      const topDestinations = (overview.topCountries || []).map((doc: any) => {
        const translatedCountryName = doc.name ? (translatedTexts[textIdx++] || String(doc.name)) : ''
        const countryBannerUrl = doc.hero && typeof doc.hero === 'object' && doc.hero.url
          ? doc.hero.url
          : (typeof doc.hero === 'string' ? doc.hero : '')

        return {
          id: Number(doc.id),
          countryName: translatedCountryName,
          cityName: translatedCountryName,
          countrySlug: doc.slug || '',
          citySlug: doc.slug || '',
          imageUrl: countryBannerUrl,
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
