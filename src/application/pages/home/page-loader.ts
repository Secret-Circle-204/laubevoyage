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

      const featuredExpIds: number[] = (overview.featuredExperiences || [])
        .map((doc: any) => Number(doc.id))
        .filter((id: number): id is number => typeof id === 'number' && id > 0)
      const featuredAggregates =
        featuredExpIds.length > 0 ? await experience.getManyByIds(featuredExpIds) : []
      const expMap = new Map(featuredAggregates.map((e) => [e.id, e]))

      const featuredExperiences = await Promise.all(
        (overview.featuredExperiences || []).map(async (doc: any) => {
          const expEntity = expMap.get(Number(doc.id))
          const basePriceEGP = expEntity
            ? await experience.resolveStartingPrice(expEntity, todayStr)
            : await experience.resolveStartingPrice(Number(doc.id), todayStr)
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


      const [countriesRes, citiesRes] = await Promise.all([
        destination.getCountries({ limit: 100 }),
        destination.getAllActiveCities({ limit: 200 }),
      ])

      const heroCountries = (countriesRes.docs || []).map((c: any) => ({
        id: Number(c.id),
        name: String(c.name),
        slug: String(c.slug),
      }))

      const heroCities = (citiesRes.docs || []).map((c: any) => ({
        id: Number(c.id),
        name: String(c.name),
        slug: String(c.slug),
        countryId: c.country ? (typeof c.country === 'object' ? Number(c.country.id) : Number(c.country)) : 0,
        countryName: c.country && typeof c.country === 'object' ? String(c.country.name) : '',
      }))

      return {
        hero: {
          title: localization.translateUiKey('hero.title', ctx),
          subtitle: localization.translateUiKey('hero.subtitle', ctx),
          ctaExploreText: localization.translateUiKey('hero.cta.primary', ctx),
          ctaDiscoverText: localization.translateUiKey('hero.cta.secondary', ctx),
          backgroundImageUrl: '',
          destinations: {
            countries: heroCountries,
            cities: heroCities,
          },
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
