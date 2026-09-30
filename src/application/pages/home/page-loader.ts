import { getDomainServices } from '@/domains/factory'
import { getBusinessDateString } from '@/lib/date'
import type { LocaleContext } from '@/types/locale'
import { ExperiencesCatalogLoader } from '@/application/experience/loaders'
import type { HomeDTO } from './dto'

export class HomePageLoader {
  static async load(ctx: LocaleContext): Promise<HomeDTO> {
    console.log(`[HomePageLoader.load] called with currency = "${ctx.currency}", requestContextId = "${ctx.requestContextId || ''}"`)
    try {
      const { destination, localization, experience } = await getDomainServices()

      const [overview, countriesRes, citiesRes, budgetPresets] = await Promise.all([
        destination.getHomePageOverview(ctx.currency),
        destination.getCountries({ limit: 100 }),
        destination.getAllActiveCities({ limit: 200 }),
        ExperiencesCatalogLoader.resolveBudgetPresets(ctx, localization),
      ])

      const heroCountryDocs = countriesRes.docs || []
      const heroCityDocs = citiesRes.docs || []

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

      for (const doc of heroCountryDocs) {
        if (doc.name) rawTexts.push(String(doc.name))
      }

      for (const doc of heroCityDocs) {
        if (doc.name) rawTexts.push(String(doc.name))
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

          // Origin Gateway City Waypoint
          const originCityName =
            doc.city && typeof doc.city === 'object'
              ? doc.city.name
              : typeof doc.city === 'string'
              ? doc.city
              : undefined

          const originCityHero =
            doc.city && typeof doc.city === 'object' && doc.city.hero
              ? (typeof doc.city.hero === 'object' ? doc.city.hero.url : doc.city.hero)
              : undefined

          // Ordered Post-Origin Destination Waypoints
          const destinationCityNames: string[] = []
          const destinationCityHeroes: string[] = []

          if (Array.isArray(doc.destinations)) {
            for (const d of doc.destinations) {
              if (d && typeof d === 'object') {
                if (d.name) destinationCityNames.push(d.name)
                const heroUrl = typeof d.hero === 'object' ? d.hero?.url : d.hero
                if (heroUrl && typeof heroUrl === 'string') destinationCityHeroes.push(heroUrl)
              }
            }
          }

          // Canonical Journey Route: Origin + Sequential Destinations
          const routeCities = [originCityName, ...destinationCityNames].filter(Boolean)

          // Visual City Avatars representing the Journey's Waypoints (Strictly authentic from city records)
          const thumbnails = [originCityHero, ...destinationCityHeroes].filter(
            (url): url is string => typeof url === 'string' && url.length > 0,
          )

          // Real included provisions strictly from database
          const rawIncluded =
            expEntity?.included && expEntity.included.length > 0
              ? expEntity.included
              : Array.isArray(doc.included)
              ? doc.included
                  .map((x: any) => (typeof x === 'object' && x ? x.item : x))
                  .filter(Boolean)
              : []

          const features = rawIncluded.slice(0, 3)

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
            routeCities,
            thumbnails,
            features,
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


      const heroCountries = heroCountryDocs.map((c: any) => ({
        id: Number(c.id),
        name: c.name ? (translatedTexts[textIdx++] || String(c.name)) : '',
        slug: String(c.slug || ''),
      }))

      const heroCountryMap = new Map(heroCountries.map((c) => [c.id, c.name]))

      const heroCities = heroCityDocs.map((c: any) => {
        const cId = c.country ? (typeof c.country === 'object' ? Number(c.country.id) : Number(c.country)) : 0
        const cName = heroCountryMap.get(cId) || (c.country && typeof c.country === 'object' ? String(c.country.name) : '')
        return {
          id: Number(c.id),
          name: c.name ? (translatedTexts[textIdx++] || String(c.name)) : '',
          slug: String(c.slug || ''),
          countryId: cId,
          countryName: cName,
        }
      })

      return {
        hero: {
          title: localization.translateUiKey('hero.title', ctx),
          subtitle: localization.translateUiKey('hero.subtitle', ctx),
          ctaExploreText: localization.translateUiKey('hero.cta.primary', ctx),
          ctaDiscoverText: localization.translateUiKey('hero.cta.secondary', ctx),
          ctaJoinVoyagersText: localization.translateUiKey('hero.cta.joinVoyagers', ctx),
          ctaVoyagerPortalText: localization.translateUiKey('hero.cta.voyagerPortal', ctx),
          backgroundImageUrl: '',
          destinations: {
            countries: heroCountries,
            cities: heroCities,
          },
          budgetPresets,
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
