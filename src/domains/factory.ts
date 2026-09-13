import { getPayload } from 'payload'
import config from '@payload-config'

import { DestinationRepository } from './destination/repository'
import { DestinationService } from './destination/service'
import { countryCatalogRegistry } from './destination/country-registry'

import { ExperienceRepository } from './experience/repository'
import { ExperienceService } from './experience/service'

import { ContentRepository } from './content/repository'
import { ContentService } from './content/service'

import { BookingRepository } from './booking/repository'
import { BookingService } from './booking/service'

import { CustomerRepository } from './customer/repository'
import { CustomerService } from './customer/service'

import { DashboardProjectionRepository } from './dashboard/repository'
import { DashboardQueryBus } from './dashboard/query-bus'
import { DashboardOverviewAggregator } from './dashboard/overview-aggregator'
import { DashboardService } from './dashboard/service'

import { PaymentRepository } from './payment/repository'
import { PaymentService } from './payment/service'

import { CurrencyRepository } from './currency/repository'
import { CurrencyService } from './currency/service'
import { CompositeExchangeRateProvider } from './currency/providers/composite-provider'
import { rateRegistry } from './currency/rate-registry'
import { catalogRegistry } from './currency/catalog-registry'
import { LoyaltyRepository } from './loyalty/repository'
import { LoyaltyService } from './loyalty/service'
import { NotificationRepository } from './notification/repository'
import { NotificationService } from './notification/service'
import { TranslationRepository } from './translation/repository'
import { TranslationService } from './translation/service'
import { LocalizationService } from './localization/service'
import { PricingPipeline } from './currency/pipeline'
import { PricingFacade } from './currency/facade'
import { ExperienceWorkflowEngine } from './experience/workflow'
import { SearchService } from './search/service'
import { MaintenanceRepository } from './maintenance/repository'

import { MaintenanceService } from './maintenance/service'
import { LanguageRepository } from './languages/repository'
import { LanguageService } from './languages/service'
import { SystemRepository } from './system/repository'
import { SystemIntegrationService } from './system/service'
import { systemSettingsRegistry } from './system/settings-registry'

import { ReviewRepository } from './review/repository'
import { ReviewService } from './review/service'

import { PayloadOutboxRepository } from './events/repositories/payload-outbox-repository'
import { EventOutboxService } from './events/outbox'

export type DomainServices = ReturnType<typeof createPureDomainServices>

let defaultPayloadPromise: Promise<any> | null = null
let defaultContainerPromise: Promise<DomainServices> | null = null
let defaultContainer: DomainServices | null = null

/**
 * Resolves the process-wide default Payload CMS instance lazily.
 */
export async function resolveDefaultPayload(): Promise<any> {
  if (!defaultPayloadPromise) {
    defaultPayloadPromise = getPayload({ config }).catch((err) => {
      defaultPayloadPromise = null
      throw err
    })
  }
  return defaultPayloadPromise
}

/**
 * Domain Service Factory (Composition Root)
 * Pure Inversion of Control & Constructor Dependency Injection Container.
 * 100% Synchronous, In-Memory Object Graph Instantiation.
 * ZERO await, ZERO I/O, ZERO Network, ZERO Subscribers wiring, ZERO LISTEN.
 */
export function createPureDomainServices(payload: any) {
  // 1. Instantiate Repositories & Providers
  const outboxRepository = new PayloadOutboxRepository(payload)
  EventOutboxService.getInstance(outboxRepository)

  const destinationRepository = new DestinationRepository(payload)
  const experienceRepository = new ExperienceRepository(payload)
  const contentRepository = new ContentRepository(payload)
  const bookingRepository = new BookingRepository(payload)
  const customerRepository = new CustomerRepository(payload)
  const reviewRepository = new ReviewRepository(payload)
  const dashboardRepository = new DashboardProjectionRepository(payload)
  const paymentRepository = new PaymentRepository(payload)
  const currencyRepository = new CurrencyRepository(payload)
  const compositeRateProvider = new CompositeExchangeRateProvider()
  const systemRepository = new SystemRepository(payload)
  const loyaltyRepository = new LoyaltyRepository(payload)
  const notificationRepository = new NotificationRepository(payload)
  const translationRepository = new TranslationRepository(payload)
  const maintenanceRepository = new MaintenanceRepository(payload)
  const languageRepository = new LanguageRepository(payload)

  // 2. Instantiate Base Services & Buses
  const translationService = new TranslationService(translationRepository)
  const currencyService = new CurrencyService(currencyRepository, compositeRateProvider)

  // Wrap currencyService to implement IExchangeRateProvider for PricingPipeline
  const serviceRateProvider = {
    getExchangeRate: async (fromCurrency: string, toCurrency: string) => {
      return currencyService.getRate(fromCurrency as any, toCurrency as any)
    },
  }

  const serviceSettingsProvider = {
    getSettings: async () => {
      const settings = await systemSettingsRegistry.getSettings(systemRepository)
      return {
        vatRate: settings.vatRate / 100,
        vatEnabled: settings.vatEnabled,
        pricesIncludeVat: settings.pricesIncludeVat,
      }
    },
  }

  const languageService = new LanguageService(languageRepository)
  const pricingPipeline = new PricingPipeline(serviceRateProvider, serviceSettingsProvider)
  const pricingFacade = new PricingFacade(pricingPipeline)
  const localizationService = new LocalizationService(
    translationService,
    pricingFacade,
    undefined,
    languageService,
  )
  const notificationService = new NotificationService(notificationRepository)
  const loyaltyService = new LoyaltyService(loyaltyRepository)
  const customerDeletionDependencyChecker = {
    checkDependencies: async (customerId: number, req?: any) => {
      const [bookings, pointLedgers, reviews, payments, pendingEvents] = await Promise.all([
        payload.count({
          collection: 'bookings',
          where: { user: { equals: customerId } },
          req,
        }),
        payload.count({
          collection: 'point-ledger',
          where: { user: { equals: customerId } },
          req,
        }),
        payload.count({
          collection: 'reviews',
          where: { customer: { equals: customerId } },
          req,
        }),
        payload.count({
          collection: 'payment-transactions',
          where: { customerId: { equals: customerId } },
          req,
        }),
        payload.count({
          collection: 'event-outbox',
          where: {
            and: [
              { status: { in: ['pending', 'processing', 'failed'] } },
              {
                or: [
                  { 'payload.customerId': { equals: customerId } },
                  { 'payload.customer.id': { equals: customerId } },
                  { 'payload.booking.customerId': { equals: customerId } },
                ],
              },
            ],
          },
          req,
        }),
      ])
      return {
        bookingCount: bookings.totalDocs,
        pointLedgerCount: pointLedgers.totalDocs,
        reviewCount: reviews.totalDocs,
        paymentCount: payments.totalDocs,
        pendingOutboxCount: pendingEvents.totalDocs,
      }
    },
  }

  const customerService = new CustomerService(customerRepository, customerDeletionDependencyChecker)

  const experienceWorkflowEngine = new ExperienceWorkflowEngine(
    experienceRepository,
    pricingPipeline,
  )
  const experienceService = new ExperienceService(experienceRepository, experienceWorkflowEngine)

  const bookingService = new BookingService(
    bookingRepository,
    customerRepository,
    experienceService,
    loyaltyService,
    pricingPipeline,
  )
  const reviewService = new ReviewService(reviewRepository, bookingService)
  const paymentService = new PaymentService(
    paymentRepository,
    bookingRepository,
    customerRepository,
    experienceRepository,
    outboxRepository,
  )
  const searchService = new SearchService(experienceService)

  const dashboardQueryBus = new DashboardQueryBus(
    customerRepository,
    loyaltyRepository,
    bookingRepository,
  )
  const dashboardOverviewAggregator = new DashboardOverviewAggregator(dashboardQueryBus)
  const dashboardService = new DashboardService(dashboardRepository, dashboardQueryBus)
  const destinationService = new DestinationService(destinationRepository)
  const maintenanceService = new MaintenanceService(
    maintenanceRepository,
    bookingService,
    currencyService,
    dashboardRepository,
    dashboardOverviewAggregator,
  )
  const systemIntegrationService = new SystemIntegrationService(payload)

  // Pure Injected Domain Services Container (Zero Runtime Side-Effects)
  return {
    payload,
    system: systemIntegrationService,
    destination: destinationService,
    experience: experienceService,
    content: new ContentService(contentRepository),
    booking: bookingService,
    customer: customerService,
    review: reviewService,
    search: searchService,
    dashboard: dashboardService,
    payment: paymentService,
    currency: currencyService,
    loyalty: loyaltyService,
    notification: notificationService,
    translation: translationService,
    localization: localizationService,
    maintenance: maintenanceService,
    language: languageService,
    pricingPipeline,
    pricingFacade,
  }
}

/**
 * Wires process-level singleton registries strictly to the default container repositories.
 */
function wireGlobalRegistries(container: DomainServices): void {
  countryCatalogRegistry.setRepository(new DestinationRepository(container.payload))
  const currencyRepo = new CurrencyRepository(container.payload)
  rateRegistry.setRepository(currencyRepo)
  catalogRegistry.setRepository(currencyRepo)
  systemSettingsRegistry.setRepository(new SystemRepository(container.payload))
}

/**
 * Domain Services Resolver (Single Entry Point)
 * Thread-safe resolution with self-healing retry on failure.
 * Completely immune to circular re-entrancy during cold boot.
 */
export async function getDomainServices(providedPayload?: any): Promise<DomainServices> {
  // If an explicit payload instance is passed (e.g. onInit or an isolated test):
  if (providedPayload) {
    if (defaultContainer && defaultContainer.payload === providedPayload) {
      return defaultContainer
    }
    // Instant synchronous in-memory resolution without awaiting any pending promise!
    return createPureDomainServices(providedPayload)
  }

  // Global default singleton resolution
  if (defaultContainer) {
    return defaultContainer
  }

  if (!defaultContainerPromise) {
    defaultContainerPromise = (async () => {
      try {
        const payload = await resolveDefaultPayload()
        const container = createPureDomainServices(payload)
        wireGlobalRegistries(container)
        defaultContainer = container
        return container
      } catch (err) {
        // Reset promises on error to allow future retry
        defaultContainerPromise = null
        defaultPayloadPromise = null
        throw err
      }
    })()
  }

  return defaultContainerPromise
}
