import { EventBus } from '../event-bus'
import { RevalidationService, type RevalidationResult } from '@/domains/shared/revalidation-service'

import type {
  SystemSettingsUpdatedEvent,
  LoyaltySettingsUpdatedEvent,
  CurrencyCatalogUpdatedEvent,
  LanguageCatalogUpdatedEvent,
  CurrencyRatesUpdatedEvent,
  CountryMutatedEvent,
  CityMutatedEvent,
  ExperienceMutatedEvent,
  SlotInventoryMutatedEvent,
  DashboardProjectionRebuiltEvent,
  ContentPageMutatedEvent,
  BlogPostMutatedEvent,
  FaqMutatedEvent,
  TranslationCacheMutatedEvent
} from '../cache-events'

function handleRevalidationOutcome(subscriberName: string, result: RevalidationResult): void {
  if (!result.success) {
    console.warn(
      `[PresentationSubscriber] ⚠️ Presentation cache invalidation failed in ${subscriberName} (Code: ${result.code || 'UNKNOWN'}, Status: ${result.status || 'N/A'}). Domain state intact.`
    )
  }
}

/**
 * Next.js Presentation Cache Invalidation Subscriber
 * Listens to primary business events and purges Next.js presentation caches (HTML/tags).
 * Loaded ONLY in Next.js process contexts (e.g. process.env.NEXT_RUNTIME or explicit runtime flag).
 */
export function registerPresentationSubscriber(): void {
  const eventBus = EventBus.getInstance()
  console.log('[PresentationSubscriber] Bootstrapping Next.js Cache Invalidation Subscriber')

  eventBus.subscribe<SystemSettingsUpdatedEvent>(
    'SYSTEM_SETTINGS_UPDATED',
    'PresentationSubscriber.purgeLayoutOnSettings',
    async (event) => {
      console.log('[PresentationSubscriber] SYSTEM_SETTINGS_UPDATED Event received. Purging Next.js layout cache.')
      const result = await RevalidationService.purgeLayout()
      handleRevalidationOutcome('purgeLayoutOnSettings', result)
    }
  )

  eventBus.subscribe<LoyaltySettingsUpdatedEvent>(
    'LOYALTY_SETTINGS_UPDATED',
    'PresentationSubscriber.purgeDashboardOnLoyaltySettings',
    async (event) => {
      console.log('[PresentationSubscriber] LOYALTY_SETTINGS_UPDATED Event received. Purging Next.js dashboard/checkout caches.')
      const result = await RevalidationService.purgeLayout()
      handleRevalidationOutcome('purgeDashboardOnLoyaltySettings', result)
    }
  )

  eventBus.subscribe<CurrencyCatalogUpdatedEvent>(
    'CURRENCY_CATALOG_UPDATED',
    'PresentationSubscriber.purgeCurrenciesOnCurrencyCatalog',
    async (event) => {
      console.log('[PresentationSubscriber] CURRENCY_CATALOG_UPDATED Event received. Purging Next.js currencies cache tag.')
      const result = await RevalidationService.purgeCurrencies()
      handleRevalidationOutcome('purgeCurrenciesOnCurrencyCatalog', result)
    }
  )

  eventBus.subscribe<LanguageCatalogUpdatedEvent>(
    'LANGUAGE_CATALOG_UPDATED',
    'PresentationSubscriber.purgeLanguagesOnLanguageCatalog',
    async (event) => {
      console.log('[PresentationSubscriber] LANGUAGE_CATALOG_UPDATED Event received. Purging Next.js languages cache tag.')
      const result = await RevalidationService.purgeLanguages()
      handleRevalidationOutcome('purgeLanguagesOnLanguageCatalog', result)
    }
  )

  eventBus.subscribe<CurrencyRatesUpdatedEvent>(
    'CURRENCY_RATES_UPDATED',
    'PresentationSubscriber.purgePriceArtifactsOnRates',
    async (event) => {
      console.log('[PresentationSubscriber] CURRENCY_RATES_UPDATED Event received. Purging Next.js price-dependent experiences cache.')
      const result = await RevalidationService.purgeExperiences()
      handleRevalidationOutcome('purgePriceArtifactsOnRates', result)
    }
  )

  eventBus.subscribe<CountryMutatedEvent>(
    'COUNTRY_MUTATED',
    'PresentationSubscriber.purgeCountryPage',
    async (event) => {
      console.log(`[PresentationSubscriber] COUNTRY_MUTATED Event received for ${event.countryCode}. Purging destinations and country paths.`)
      const result = await RevalidationService.purgeDestinations()
      handleRevalidationOutcome('purgeCountryPage.destinations', result)
      if (event.slug) {
        const slugResult = await RevalidationService.purgeCountrySlug(event.slug)
        handleRevalidationOutcome('purgeCountryPage.slug', slugResult)
      }
    }
  )

  eventBus.subscribe<CityMutatedEvent>(
    'CITY_MUTATED',
    'PresentationSubscriber.purgeCityPage',
    async (event) => {
      console.log(`[PresentationSubscriber] CITY_MUTATED Event received for ${event.slug}. Purging city layout path.`)
      const result = await RevalidationService.purgeDestinations()
      handleRevalidationOutcome('purgeCityPage.destinations', result)
      if (event.countrySlug && event.slug) {
        const cityResult = await RevalidationService.purgeCitySlug(event.countrySlug, event.slug)
        handleRevalidationOutcome('purgeCityPage.citySlug', cityResult)
      }
    }
  )

  eventBus.subscribe<ExperienceMutatedEvent>(
    'EXPERIENCE_MUTATED',
    'PresentationSubscriber.purgeExperiencePage',
    async (event) => {
      console.log(`[PresentationSubscriber] EXPERIENCE_MUTATED Event received for ${event.slug}. Purging experience details.`)
      const result = await RevalidationService.purgeExperiences()
      handleRevalidationOutcome('purgeExperiencePage.experiences', result)
      if (event.slug) {
        const slugResult = await RevalidationService.purgeExperienceSlug(event.slug)
        handleRevalidationOutcome('purgeExperiencePage.slug', slugResult)
      }
    }
  )

  eventBus.subscribe<SlotInventoryMutatedEvent>(
    'SLOT_INVENTORY_MUTATED',
    'PresentationSubscriber.purgeExperienceSlots',
    async (event) => {
      console.log(`[PresentationSubscriber] SLOT_INVENTORY_MUTATED Event received for ${event.experienceSlug}. Purging slots cached layout.`)
      if (event.experienceSlug) {
        const result = await RevalidationService.purgeExperienceSlug(event.experienceSlug)
        handleRevalidationOutcome('purgeExperienceSlots', result)
      }
    }
  )

  eventBus.subscribe<DashboardProjectionRebuiltEvent>(
    'DASHBOARD_PROJECTION_REBUILT',
    'PresentationSubscriber.purgeDashboardViews',
    async (event) => {
      console.log(`[PresentationSubscriber] DASHBOARD_PROJECTION_REBUILT Event received for Customer #${event.customerId}. Targeted Slices:`, event.slices || 'ALL')
      const result = event.slices && Array.isArray(event.slices) && event.slices.length > 0
        ? await RevalidationService.purgeDashboardSlices(event.customerId, event.slices)
        : await RevalidationService.purgeDashboard(event.customerId)
      handleRevalidationOutcome('purgeDashboardViews', result)
    }
  )

  eventBus.subscribe<ContentPageMutatedEvent>(
    'CONTENT_PAGE_MUTATED',
    'PresentationSubscriber.purgePageContent',
    async (event) => {
      console.log(`[PresentationSubscriber] CONTENT_PAGE_MUTATED Event received for ${event.slug}. Purging page content cache.`)
      if (event.slug) {
        const result = await RevalidationService.purgeContent(event.slug)
        handleRevalidationOutcome('purgePageContent', result)
      }
    }
  )

  eventBus.subscribe<BlogPostMutatedEvent>(
    'BLOG_POST_MUTATED',
    'PresentationSubscriber.purgeBlogPost',
    async (event) => {
      console.log(`[PresentationSubscriber] BLOG_POST_MUTATED Event received for ${event.slug}. Purging blog views.`)
      if (event.slug) {
        const result = await RevalidationService.purgeBlog(event.slug)
        handleRevalidationOutcome('purgeBlogPost', result)
      }
    }
  )

  eventBus.subscribe<FaqMutatedEvent>(
    'FAQ_MUTATED',
    'PresentationSubscriber.purgeFaqPage',
    async (event) => {
      console.log('[PresentationSubscriber] FAQ_MUTATED Event received. Purging FAQ view.')
      const result = await RevalidationService.purgeContent('faq')
      handleRevalidationOutcome('purgeFaqPage', result)
    }
  )

  eventBus.subscribe<TranslationCacheMutatedEvent>(
    'TRANSLATION_CACHE_MUTATED',
    'PresentationSubscriber.purgeTranslation',
    async (event) => {
      console.log(`[PresentationSubscriber] TRANSLATION_CACHE_MUTATED Event received for [${event.originalHash}] (${event.language}). Purging translation cache.`)
      const result = await RevalidationService.purgeTranslation(event.originalHash, event.language)
      handleRevalidationOutcome('purgeTranslation', result)
    }
  )
}
