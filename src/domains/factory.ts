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
import { LoyaltyRepository } from './loyalty/repository'
import { LoyaltyService } from './loyalty/service'
import { NotificationRepository } from './notification/repository'
import { NotificationService } from './notification/service'
import { TranslationRepository } from './translation/repository'
import { TranslationService } from './translation/service'
import { LocalizationService } from './localization/service'
import { SearchRepository } from './search/repository'
import { SearchService } from './search/service'
import { MaintenanceRepository } from './maintenance/repository'
import { MaintenanceService } from './maintenance/service'

/**
 * Domain Service Factory (Composition Root)
 * Pure Inversion of Control & Constructor Dependency Injection Container.
 * Instantiates Repositories with Payload and injects Repositories into Domain Services.
 * Completely encapsulates Payload CMS initialization away from the Application & Domain Layers.
 */
export async function getDomainServices() {
  const payload = await getPayload({ config })

  // 1. Instantiate Repositories & Providers
  const destinationRepository = new DestinationRepository(payload)
  const experienceRepository = new ExperienceRepository(payload)
  const contentRepository = new ContentRepository(payload)
  const bookingRepository = new BookingRepository(payload)
  const customerRepository = new CustomerRepository(payload)
  const dashboardRepository = new DashboardProjectionRepository(payload)
  const paymentRepository = new PaymentRepository(payload)
  const currencyRepository = new CurrencyRepository(payload)
  const compositeRateProvider = new CompositeExchangeRateProvider()
  const loyaltyRepository = new LoyaltyRepository(payload)
  const notificationRepository = new NotificationRepository(payload)
  const translationRepository = new TranslationRepository(payload)
  const maintenanceRepository = new MaintenanceRepository(payload)
  const searchRepository = new SearchRepository(payload)

  // 2. Instantiate Base Services & Buses
  const translationService = new TranslationService(translationRepository)
  const localizationService = new LocalizationService(translationService)
  const notificationService = new NotificationService(notificationRepository)
  const loyaltyService = new LoyaltyService(loyaltyRepository)
  const customerService = new CustomerService(customerRepository)
  const experienceService = new ExperienceService(experienceRepository)
  const bookingService = new BookingService(bookingRepository, customerRepository, experienceRepository, loyaltyService)
  const paymentService = new PaymentService(paymentRepository, bookingRepository, customerRepository, experienceRepository)
  const searchService = new SearchService(searchRepository)
  const dashboardQueryBus = new DashboardQueryBus(customerRepository, loyaltyRepository, bookingRepository)
  const dashboardService = new DashboardService(dashboardRepository, dashboardQueryBus)
  const currencyService = new CurrencyService(currencyRepository, compositeRateProvider)
  const destinationService = new DestinationService(destinationRepository)
  const maintenanceService = new MaintenanceService(maintenanceRepository, bookingService)

  // 3. Return Pure Injected Domain Services Container
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
  }
}
