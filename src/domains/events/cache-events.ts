import type { BaseDomainEvent } from './event-bus'

export interface SystemSettingsUpdatedEvent extends BaseDomainEvent {
  type: 'SYSTEM_SETTINGS_UPDATED'
}

export interface LoyaltySettingsUpdatedEvent extends BaseDomainEvent {
  type: 'LOYALTY_SETTINGS_UPDATED'
}

export interface CurrencyCatalogUpdatedEvent extends BaseDomainEvent {
  type: 'CURRENCY_CATALOG_UPDATED'
}

export interface LanguageCatalogUpdatedEvent extends BaseDomainEvent {
  type: 'LANGUAGE_CATALOG_UPDATED'
  languageCode?: string
}

export interface CurrencyRatesUpdatedEvent extends BaseDomainEvent {
  type: 'CURRENCY_RATES_UPDATED'
}

export interface CountryMutatedEvent extends BaseDomainEvent {
  type: 'COUNTRY_MUTATED'
  countryCode: string
  slug: string
}

export interface CityMutatedEvent extends BaseDomainEvent {
  type: 'CITY_MUTATED'
  countrySlug: string
  slug: string
}

export interface ExperienceMutatedEvent extends BaseDomainEvent {
  type: 'EXPERIENCE_MUTATED'
  slug: string
}

export interface SlotInventoryMutatedEvent extends BaseDomainEvent {
  type: 'SLOT_INVENTORY_MUTATED'
  experienceSlug: string
}

export interface DashboardProjectionRebuiltEvent extends BaseDomainEvent {
  type: 'DASHBOARD_PROJECTION_REBUILT'
  customerId: number
}

export interface ContentPageMutatedEvent extends BaseDomainEvent {
  type: 'CONTENT_PAGE_MUTATED'
  slug: string
}

export interface BlogPostMutatedEvent extends BaseDomainEvent {
  type: 'BLOG_POST_MUTATED'
  slug: string
}

export interface FaqMutatedEvent extends BaseDomainEvent {
  type: 'FAQ_MUTATED'
}
