import { EventBus } from '../event-bus'
import { RevalidationService } from '@/domains/shared/revalidation-service'

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
  FaqMutatedEvent
} from '../cache-events'

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
      await RevalidationService.purgeLayout()
    }
  )

  eventBus.subscribe<LoyaltySettingsUpdatedEvent>(
    'LOYALTY_SETTINGS_UPDATED',
    'PresentationSubscriber.purgeDashboardOnLoyaltySettings',
    async (event) => {
      console.log('[PresentationSubscriber] LOYALTY_SETTINGS_UPDATED Event received. Purging Next.js dashboard/checkout caches.')
      await RevalidationService.purgeLayout() // Settings could change currency points conversions
    }
  )

  eventBus.subscribe<CurrencyCatalogUpdatedEvent>(
    'CURRENCY_CATALOG_UPDATED',
    'PresentationSubscriber.purgeLayoutOnCurrencyCatalog',
    async (event) => {
      console.log('[PresentationSubscriber] CURRENCY_CATALOG_UPDATED Event received. Purging Next.js layout cache.')
      await RevalidationService.purgeLayout()
    }
  )

  eventBus.subscribe<LanguageCatalogUpdatedEvent>(
    'LANGUAGE_CATALOG_UPDATED',
    'PresentationSubscriber.purgeLayoutOnLanguageCatalog',
    async (event) => {
      console.log('[PresentationSubscriber] LANGUAGE_CATALOG_UPDATED Event received. Purging Next.js layout cache.')
      await RevalidationService.purgeLayout()
    }
  )

  eventBus.subscribe<CurrencyRatesUpdatedEvent>(
    'CURRENCY_RATES_UPDATED',
    'PresentationSubscriber.purgeLayoutOnRates',
    async (event) => {
      console.log('[PresentationSubscriber] CURRENCY_RATES_UPDATED Event received. Purging Next.js layout and product prices cache.')
      await RevalidationService.purgeLayout()
      await RevalidationService.purgeExperiences() // Re-cache experience card prices
    }
  )

  eventBus.subscribe<CountryMutatedEvent>(
    'COUNTRY_MUTATED',
    'PresentationSubscriber.purgeCountryPage',
    async (event) => {
      console.log(`[PresentationSubscriber] COUNTRY_MUTATED Event received for ${event.countryCode}. Purging destinations and country paths.`)
      await RevalidationService.purgeDestinations()
      if (event.slug) {
        await RevalidationService.purgeCountrySlug(event.slug)
      }
    }
  )

  eventBus.subscribe<CityMutatedEvent>(
    'CITY_MUTATED',
    'PresentationSubscriber.purgeCityPage',
    async (event) => {
      console.log(`[PresentationSubscriber] CITY_MUTATED Event received for ${event.slug}. Purging city layout path.`)
      await RevalidationService.purgeDestinations()
      if (event.countrySlug && event.slug) {
        await RevalidationService.purgeCitySlug(event.countrySlug, event.slug)
      }
    }
  )

  eventBus.subscribe<ExperienceMutatedEvent>(
    'EXPERIENCE_MUTATED',
    'PresentationSubscriber.purgeExperiencePage',
    async (event) => {
      console.log(`[PresentationSubscriber] EXPERIENCE_MUTATED Event received for ${event.slug}. Purging experience details.`)
      await RevalidationService.purgeExperiences()
      if (event.slug) {
        await RevalidationService.purgeExperienceSlug(event.slug)
      }
    }
  )

  eventBus.subscribe<SlotInventoryMutatedEvent>(
    'SLOT_INVENTORY_MUTATED',
    'PresentationSubscriber.purgeExperienceSlots',
    async (event) => {
      console.log(`[PresentationSubscriber] SLOT_INVENTORY_MUTATED Event received for ${event.experienceSlug}. Purging slots cached layout.`)
      if (event.experienceSlug) {
        await RevalidationService.purgeExperienceSlug(event.experienceSlug)
      }
    }
  )

  eventBus.subscribe<DashboardProjectionRebuiltEvent>(
    'DASHBOARD_PROJECTION_REBUILT',
    'PresentationSubscriber.purgeDashboardViews',
    async (event) => {
      console.log(`[PresentationSubscriber] DASHBOARD_PROJECTION_REBUILT Event received for Customer #${event.customerId}. Targeted Slices:`, event.slices || 'ALL')
      if (event.slices && Array.isArray(event.slices) && event.slices.length > 0) {
        await RevalidationService.purgeDashboardSlices(event.customerId, event.slices)
      } else {
        await RevalidationService.purgeDashboard(event.customerId)
      }
    }
  )

  eventBus.subscribe<ContentPageMutatedEvent>(
    'CONTENT_PAGE_MUTATED',
    'PresentationSubscriber.purgePageContent',
    async (event) => {
      console.log(`[PresentationSubscriber] CONTENT_PAGE_MUTATED Event received for ${event.slug}. Purging page content cache.`)
      if (event.slug) {
        await RevalidationService.purgeContent(event.slug)
      }
    }
  )

  eventBus.subscribe<BlogPostMutatedEvent>(
    'BLOG_POST_MUTATED',
    'PresentationSubscriber.purgeBlogPost',
    async (event) => {
      console.log(`[PresentationSubscriber] BLOG_POST_MUTATED Event received for ${event.slug}. Purging blog views.`)
      if (event.slug) {
        await RevalidationService.purgeBlog(event.slug)
      }
    }
  )

  eventBus.subscribe<FaqMutatedEvent>(
    'FAQ_MUTATED',
    'PresentationSubscriber.purgeFaqPage',
    async (event) => {
      console.log('[PresentationSubscriber] FAQ_MUTATED Event received. Purging FAQ view.')
      await RevalidationService.purgeContent('faq')
    }
  )
}
