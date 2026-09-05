import { EventBus } from '../event-bus'
import { systemSettingsRegistry } from '@/domains/system/settings-registry'
import { loyaltyProgramRegistry } from '@/domains/loyalty/program-registry'
import { rateRegistry } from '@/domains/currency/rate-registry'
import { catalogRegistry } from '@/domains/currency/catalog-registry'
import { countryCatalogRegistry } from '@/domains/destination/country-registry'
import { ContentCacheManager } from '@/domains/content/cache-manager'
import { LanguageRepository } from '@/domains/languages/repository'
import { TranslationRepository } from '@/domains/translation/repository'

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
  ContentPageMutatedEvent,
  BlogPostMutatedEvent,
  FaqMutatedEvent,
  TranslationCacheMutatedEvent
} from '../cache-events'

/**
 * Domain-Specific Cache Invalidation Subscribers
 * Handles in-process RAM memory registry cache clearing for respective domains.
 * Establishes Domain Purity: Contains absolutely NO imports or dependencies on next/cache.
 */
export function registerSystemCacheSubscriber(): void {
  const eventBus = EventBus.getInstance()

  eventBus.subscribe<SystemSettingsUpdatedEvent>(
    'SYSTEM_SETTINGS_UPDATED',
    'SystemCacheSubscriber.invalidateSystemSettings',
    (event) => {
      console.log('[SystemCacheSubscriber] SYSTEM_SETTINGS_UPDATED Event received. Invalidating systemSettingsRegistry cache.')
      systemSettingsRegistry.invalidate()
    }
  )

  eventBus.subscribe<LoyaltySettingsUpdatedEvent>(
    'LOYALTY_SETTINGS_UPDATED',
    'SystemCacheSubscriber.invalidateLoyaltySettings',
    (event) => {
      console.log('[SystemCacheSubscriber] LOYALTY_SETTINGS_UPDATED Event received. Invalidating loyaltyProgramRegistry cache.')
      loyaltyProgramRegistry.invalidate()
    }
  )
}

export function registerCurrencyCacheSubscriber(): void {
  const eventBus = EventBus.getInstance()

  eventBus.subscribe<CurrencyCatalogUpdatedEvent>(
    'CURRENCY_CATALOG_UPDATED',
    'CurrencyCacheSubscriber.invalidateCatalog',
    (event) => {
      console.log('[CurrencyCacheSubscriber] CURRENCY_CATALOG_UPDATED Event received. Invalidating catalogRegistry cache.')
      catalogRegistry.invalidate()
    }
  )

  eventBus.subscribe<CurrencyRatesUpdatedEvent>(
    'CURRENCY_RATES_UPDATED',
    'CurrencyCacheSubscriber.invalidateRates',
    (event) => {
      console.log('[CurrencyCacheSubscriber] CURRENCY_RATES_UPDATED Event received. Invalidating rateRegistry cache.')
      rateRegistry.invalidate()
    }
  )
}

export function registerLanguageCacheSubscriber(): void {
  const eventBus = EventBus.getInstance()

  eventBus.subscribe<LanguageCatalogUpdatedEvent>(
    'LANGUAGE_CATALOG_UPDATED',
    'LanguageCacheSubscriber.invalidateLanguages',
    (event) => {
      console.log('[LanguageCacheSubscriber] LANGUAGE_CATALOG_UPDATED Event received. Invalidating LanguageRepository cache.')
      LanguageRepository.invalidateAll()
    }
  )
}

export function registerDestinationCacheSubscriber(): void {
  const eventBus = EventBus.getInstance()

  eventBus.subscribe<CountryMutatedEvent>(
    'COUNTRY_MUTATED',
    'DestinationCacheSubscriber.invalidateCountries',
    (event) => {
      console.log(`[DestinationCacheSubscriber] COUNTRY_MUTATED Event received for ${event.countryCode}. Invalidating countryCatalogRegistry cache.`)
      countryCatalogRegistry.invalidate()
    }
  )
}

export function registerContentCacheSubscriber(): void {
  const eventBus = EventBus.getInstance()

  eventBus.subscribe<ContentPageMutatedEvent>(
    'CONTENT_PAGE_MUTATED',
    'ContentCacheSubscriber.invalidatePage',
    (event) => {
      console.log(`[ContentCacheSubscriber] CONTENT_PAGE_MUTATED Event received for ${event.slug}. Invalidating ContentCacheManager cache.`)
      ContentCacheManager.invalidateAndRevalidate(event.slug)
    }
  )
}

export function registerTranslationCacheSubscriber(): void {
  const eventBus = EventBus.getInstance()

  eventBus.subscribe<TranslationCacheMutatedEvent>(
    'TRANSLATION_CACHE_MUTATED',
    'TranslationCacheSubscriber.invalidateKey',
    (event) => {
      console.log(`[TranslationCacheSubscriber] TRANSLATION_CACHE_MUTATED Event received for [${event.originalHash}] (${event.language}). Evicting local RAM.`)
      TranslationRepository.evictAll(event.originalHash, event.language)
    }
  )
}
