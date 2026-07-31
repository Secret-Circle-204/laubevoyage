import { revalidateTag, revalidatePath } from 'next/cache'

/**
 * Next.js Presentation Cache Revalidation Service
 * Provides static helper methods to purge Next.js ISR HTML and Data caches on-demand.
 * Used exclusively by the Presentation Cache Subscriber.
 */
export class RevalidationService {
  public static purgeLayout(): void {
    console.log('[RevalidationService] Purging layout tags (system-settings, currencies)')
    revalidateTag('system-settings', {})
    revalidateTag('currencies', {})
    revalidateTag('exchange-rates', {})
  }

  public static purgeExperiences(): void {
    console.log('[RevalidationService] Purging experiences listing catalog')
    revalidateTag('experiences', {})
    revalidatePath('/experiences')
  }

  public static purgeExperienceSlug(slug: string): void {
    console.log(`[RevalidationService] Purging experience detail for slug: ${slug}`)
    revalidateTag(`experience-${slug}`, {})
    revalidateTag(`slots-${slug}`, {})
    revalidatePath(`/experiences/${slug}`)
  }

  public static purgeDestinations(): void {
    console.log('[RevalidationService] Purging destinations catalogs')
    revalidateTag('destinations', {})
    revalidatePath('/destinations')
  }

  public static purgeCountrySlug(countrySlug: string): void {
    console.log(`[RevalidationService] Purging country destinations for slug: ${countrySlug}`)
    revalidateTag(`destination-${countrySlug}`, {})
    revalidatePath(`/destinations/${countrySlug}`)
  }

  public static purgeCitySlug(countrySlug: string, citySlug: string): void {
    console.log(`[RevalidationService] Purging city layout for city: ${citySlug} in country: ${countrySlug}`)
    revalidateTag(`city-${citySlug}`, {})
    revalidatePath(`/destinations/${countrySlug}/${citySlug}`)
  }

  public static purgeDashboard(customerId: number): void {
    console.log(`[RevalidationService] Purging customer dashboard cache views for customer ID: ${customerId}`)
    revalidateTag(`dashboard-customer-${customerId}`, {})
    revalidateTag(`bookings-customer-${customerId}`, {})
    revalidateTag(`ledger-customer-${customerId}`, {})
    revalidatePath('/dashboard')
    revalidatePath('/dashboard/bookings')
    revalidatePath('/dashboard/loyalty')
  }

  public static purgeContent(slug: string): void {
    console.log(`[RevalidationService] Purging content page: ${slug}`)
    revalidateTag('content', {})
    revalidateTag(`page-${slug}`, {})
    revalidatePath(`/${slug}`)
  }

  public static purgeBlog(slug: string): void {
    console.log(`[RevalidationService] Purging blog articles and dynamic post: ${slug}`)
    revalidateTag('blog', {})
    revalidateTag(`post-${slug}`, {})
    revalidatePath('/blog')
    revalidatePath(`/blog/${slug}`)
  }
}
