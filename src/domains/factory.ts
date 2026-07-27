import { getPayload } from 'payload'
import config from '@payload-config'

import { DestinationRepository } from './destination/repository'
import { DestinationService } from './destination/service'

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
import { SearchRepository } from './search/repository'
import { SearchService } from './search/service'
import { MaintenanceRepository } from './maintenance/repository'
import { MaintenanceService } from './maintenance/service'
import { LanguageRepository } from './languages/repository'
import { LanguageService } from './languages/service'
import { SystemRepository } from './system/repository'
import { SystemIntegrationService } from './system/service'
import { systemSettingsRegistry } from './system/settings-registry'

import { PayloadOutboxRepository } from './events/repositories/payload-outbox-repository'
import { EventOutboxService } from './events/outbox'

/**
 * Domain Service Factory (Composition Root)
 * Pure Inversion of Control & Constructor Dependency Injection Container.
 * Instantiates Repositories with Payload and injects Repositories into Domain Services.
 * Completely encapsulates Payload CMS initialization away from the Application & Domain Layers.
 */
export async function getDomainServices() {
  const payload = await getPayload({ config })

  // 1. Instantiate Repositories & Providers
  const outboxRepository = new PayloadOutboxRepository(payload)
  EventOutboxService.getInstance(outboxRepository)

  const destinationRepository = new DestinationRepository(payload)
  const experienceRepository = new ExperienceRepository(payload)
  const contentRepository = new ContentRepository(payload)
  const bookingRepository = new BookingRepository(payload)
  const customerRepository = new CustomerRepository(payload)
  const dashboardRepository = new DashboardProjectionRepository(payload)
  const paymentRepository = new PaymentRepository(payload)
  const currencyRepository = new CurrencyRepository(payload)
  rateRegistry.setRepository(currencyRepository)
  catalogRegistry.setRepository(currencyRepository)
  const compositeRateProvider = new CompositeExchangeRateProvider()
  const systemRepository = new SystemRepository(payload)
  systemSettingsRegistry.setRepository(systemRepository)
  const loyaltyRepository = new LoyaltyRepository(payload, customerRepository)
  const notificationRepository = new NotificationRepository(payload)
  const translationRepository = new TranslationRepository(payload)
  const maintenanceRepository = new MaintenanceRepository(payload)
  const searchRepository = new SearchRepository(payload)
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

  const pricingPipeline = new PricingPipeline(serviceRateProvider, serviceSettingsProvider)
  const pricingFacade = new PricingFacade(pricingPipeline)
  const localizationService = new LocalizationService(translationService, pricingFacade)
  const notificationService = new NotificationService(notificationRepository)
  const loyaltyService = new LoyaltyService(loyaltyRepository)
  const customerService = new CustomerService(customerRepository)

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
  const paymentService = new PaymentService(
    paymentRepository,
    bookingRepository,
    customerRepository,
    experienceRepository,
    outboxRepository,
  )
  const searchService = new SearchService(searchRepository)
  const dashboardQueryBus = new DashboardQueryBus(
    customerRepository,
    loyaltyRepository,
    bookingRepository,
  )
  const dashboardService = new DashboardService(dashboardRepository, dashboardQueryBus)
  const destinationService = new DestinationService(destinationRepository)
  const maintenanceService = new MaintenanceService(maintenanceRepository, bookingService)
  const languageService = new LanguageService(languageRepository)

  // 3. Bootstrap system event subscribers
  const systemIntegrationService = new SystemIntegrationService(payload)
  await systemIntegrationService.bootstrapSystem()

  // 4. Return Pure Injected Domain Services Container
  return {
    destination: destinationService,
    experience: experienceService,
    content: new ContentService(contentRepository),
    booking: bookingService,
    customer: customerService,
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
