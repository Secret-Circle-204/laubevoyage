import { getDomainServices } from '@/domains/factory'
import { BookingPricingUseCase } from './booking/pricing-usecase'

/**
 * Application Services Factory (Composition Root)
 * Instantiates Application Use Cases using Pure Injected Domain Services Container.
 * Preserves clean architecture dependency pointers (Application -> Domain).
 */
export async function getApplicationServices() {
  const domainServices = await getDomainServices()

  const bookingPricingUseCase = new BookingPricingUseCase(
    domainServices.experience,
    domainServices.pricingFacade,
    domainServices.localization,
    domainServices.loyalty,
    domainServices.booking,
  )

  return {
    ...domainServices,
    bookingPricingUseCase,
  }
}

