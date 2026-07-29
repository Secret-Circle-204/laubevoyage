// src/application/experience/loaders.ts
import { getDomainServices } from '@/domains/factory'
import { getBusinessDateString } from '@/lib/date'
import type { ParsedExperienceSearchParams } from '../shared/parsers/experience-search-parser'
import type { ExperienceCatalogDTO } from './dto'

export class ExperiencesCatalogLoader {
  static async load(
    filters: ParsedExperienceSearchParams,
    options?: { locale?: string; currency?: string },
  ): Promise<ExperienceCatalogDTO> {
    const page = filters.page || 1
    const limit = 12

    try {
      const { experience, localization } = await getDomainServices()
      const ctx = localization.buildContext({
        cookieLocale: options?.locale,
        cookieCurrency: options?.currency,
      })

      const catalog = await experience.getCatalog({
        minPriceEGP: filters.minPrice,
        maxPriceEGP: filters.maxPrice,
        type: filters.type as any,
      })

      const rawTexts: string[] = []
      for (const exp of catalog.experiences || []) {
        const item = exp as Record<string, any>
        rawTexts.push(item.title || '')
        const locationText = item.cityName ? `${item.cityName}, ${item.countryName}` : 'Egypt'
        rawTexts.push(locationText)
      }

      const translated = await localization.translateBatch(rawTexts, ctx)

      const experiences = await Promise.all(
        (catalog.experiences || []).map(async (exp, index) => {
          const item = exp as Record<string, any>
          const translatedTitle = translated[index * 2] || item.title || ''
          const translatedLocation = translated[index * 2 + 1] || 'Egypt'
          const todayStr = getBusinessDateString(ctx.timezone)
          const basePriceEGP = await experience.resolveStartingPrice(Number(item.id), todayStr)
          const priceResult = await localization.formatPrice(basePriceEGP, ctx)

          return {
            id: Number(item.id),
            slug: item.slug || '',
            title: translatedTitle,
            subtitle: translatedTitle,
            type: (item.type || 'package') as 'package' | 'daily_tour',
            imageUrl: item.heroUrl || '/images/hero-bg.jpg',
            location: translatedLocation,
            durationDays: item.durationDays || 1,
            rating: item.rating || 5,
            reviewsCount: item.reviewsCount || 0,
            price: priceResult,
          }
        }),
      )

      const labels = {
        badge: localization.translateUiKey('catalog.badge', ctx),
        title: localization.translateUiKey('catalog.title', ctx),
        description: localization.translateUiKey('catalog.description', ctx),
        filterAll: localization.translateUiKey('catalog.filterAll', ctx).replace('{count}', String(catalog.totalItems)),
        filterPackages: localization.translateUiKey('catalog.filterPackages', ctx),
        filterDailyTours: localization.translateUiKey('catalog.filterDailyTours', ctx),
        viewItinerary: localization.translateUiKey('catalog.viewItinerary', ctx),
        packageLabel: localization.translateUiKey('catalog.packageLabel', ctx),
        dailyTourLabel: localization.translateUiKey('catalog.dailyTourLabel', ctx),
      }

      return {
        filters,
        experiences,
        facets: catalog.facets,
        pagination: {
          page,
          limit,
          totalPages: catalog.totalItems > 0 ? Math.ceil(catalog.totalItems / limit) : 0,
          totalItems: catalog.totalItems,
          hasNextPage: page < Math.ceil(catalog.totalItems / limit),
          hasPrevPage: page > 1,
        },
        labels,
      }
    } catch (err: unknown) {
      console.error('[ExperiencesCatalogLoader] Error loading catalog:', err)
      return {
        filters,
        experiences: [],
        facets: {
          minPrice: 0,
          maxPrice: 0,
          categories: [],
        },
        pagination: {
          page: 1,
          limit,
          totalPages: 0,
          totalItems: 0,
          hasNextPage: false,
          hasPrevPage: false,
        },
        labels: {
          badge: 'Bespoke Portfolio',
          title: 'Experiences Catalog',
          description: 'Discover luxury tour packages and private daily tours carefully crafted for luxury travelers.',
          filterAll: 'All Experiences',
          filterPackages: 'Tour Packages',
          filterDailyTours: 'Private Daily Tours',
          viewItinerary: 'View Itinerary',
          packageLabel: 'Tour Package',
          dailyTourLabel: 'Daily Tour',
        },
      }
    }
  }
}
