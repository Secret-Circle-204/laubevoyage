import { getPayload } from 'payload'
import config from '@payload-config'
import { DestinationService } from './destination/service'
import { ExperienceService } from './experience/service'
import { ContentService } from './content/service'
import { BookingService } from './booking/service'
import { CustomerService } from './customer/service'
import { SearchService } from './search/service'
import { DashboardService } from './dashboard/service'
import { PaymentService } from './payment/service'
import { CurrencyService } from './currency/service'

/**
 * Domain Service Factory
 * Single entry point for Application Layer to acquire instantiated Domain Services.
 * Completely encapsulates Payload CMS initialization away from the Application Layer.
 */
export async function getDomainServices() {
  const payload = await getPayload({ config })

  return {
    destination: new DestinationService(payload),
    experience: new ExperienceService(payload),
    content: new ContentService(payload),
    booking: new BookingService(payload),
    customer: new CustomerService(payload),
    search: new SearchService(payload),
    dashboard: new DashboardService(payload),
    payment: new PaymentService(payload),
    currency: new CurrencyService(payload),
  }
}
