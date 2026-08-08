import { revalidateTag, revalidatePath } from 'next/cache'

console.log('[RevalidationService VERSION] REMOTE-BOUNDARY-V2')

/**
 * Next.js Presentation Cache Revalidation Service
 * Provides static helper methods to purge Next.js ISR HTML and Data caches on-demand.
 * Dynamically detects missing React/Next request context (e.g. inside background workers)
 * and dispatches revalidation requests securely via HTTP to the internal API route.
 */
export class RevalidationService {
  private static async executeRevalidation(
    payload: {
      type: 'dashboard' | 'experience' | 'destination' | 'layout' | 'content'
      customerId?: number
      experienceSlug?: string
      countrySlug?: string
      citySlug?: string
      pageSlug?: string
    },
    localActions: () => void,
    options?: { forceLocal?: boolean }
  ): Promise<void> {
    try {
      localActions()
    } catch (err: any) {
      const isStoreMissing =
        err?.message?.includes('static generation store') ||
        err?.message?.includes('static generation') ||
        err?.message?.includes('Invariant')
      if (isStoreMissing && !options?.forceLocal) {
        await this.triggerRemoteRevalidate(payload)
      } else {
        console.error(`[RevalidationService] Local revalidation failed for type ${payload.type}:`, err)
        throw err
      }
    }
  }

  private static async triggerRemoteRevalidate(payload: Record<string, any>): Promise<void> {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const secret = process.env.INTERNAL_REVALIDATION_TOKEN || 'laube-internal-token-2026'

    console.log(`[RevalidationService] Dispatching remote revalidation for:`, JSON.stringify(payload))
    try {
      const res = await fetch(`${appUrl}/api/internal/revalidate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          token: secret,
        }),
      })

      if (!res.ok) {
        const text = await res.text()
        console.error(`[RevalidationService] Remote revalidation failed (HTTP ${res.status}): ${text}`)
      } else {
        const data = await res.json()
        if (!data.success) {
          console.error(`[RevalidationService] Remote revalidation returned error:`, data.error)
        } else {
          console.log(`[RevalidationService] Remote revalidation succeeded.`)
        }
      }
    } catch (fetchErr) {
      console.error(`[RevalidationService] Failed dispatching remote revalidation fetch:`, fetchErr)
    }
  }

  public static async purgeLayout(options?: { forceLocal?: boolean }): Promise<void> {
    console.log('[RevalidationService] Purging layout tags (system-settings, currencies)')
    await this.executeRevalidation({ type: 'layout' }, () => {
      revalidateTag('system-settings', {})
      revalidateTag('currencies', {})
      revalidateTag('exchange-rates', {})
    }, options)
  }

  public static async purgeExperiences(options?: { forceLocal?: boolean }): Promise<void> {
    console.log('[RevalidationService] Purging experiences listing catalog')
    await this.executeRevalidation({ type: 'experience', experienceSlug: 'all' }, () => {
      revalidateTag('experiences', {})
      revalidatePath('/experiences')
    }, options)
  }

  public static async purgeExperienceSlug(slug: string, options?: { forceLocal?: boolean }): Promise<void> {
    console.log(`[RevalidationService] Purging experience detail for slug: ${slug}`)
    await this.executeRevalidation({ type: 'experience', experienceSlug: slug }, () => {
      revalidateTag(`experience-${slug}`, {})
      revalidateTag(`slots-${slug}`, {})
      revalidatePath(`/experiences/${slug}`)
    }, options)
  }

  public static async purgeDestinations(options?: { forceLocal?: boolean }): Promise<void> {
    console.log('[RevalidationService] Purging destinations catalogs')
    await this.executeRevalidation({ type: 'destination' }, () => {
      revalidateTag('destinations', {})
      revalidatePath('/destinations')
    }, options)
  }

  public static async purgeCountrySlug(countrySlug: string, options?: { forceLocal?: boolean }): Promise<void> {
    console.log(`[RevalidationService] Purging country destinations for slug: ${countrySlug}`)
    await this.executeRevalidation({ type: 'destination', countrySlug }, () => {
      revalidateTag(`destination-${countrySlug}`, {})
      revalidatePath(`/destinations/${countrySlug}`)
    }, options)
  }

  public static async purgeCitySlug(countrySlug: string, citySlug: string, options?: { forceLocal?: boolean }): Promise<void> {
    console.log(`[RevalidationService] Purging city layout for city: ${citySlug} in country: ${countrySlug}`)
    await this.executeRevalidation({ type: 'destination', countrySlug, citySlug }, () => {
      revalidateTag(`city-${citySlug}`, {})
      revalidatePath(`/destinations/${countrySlug}/${citySlug}`)
    }, options)
  }

  public static async purgeDashboard(customerId: number, options?: { forceLocal?: boolean }): Promise<void> {
    console.log('[RevalidationService] purgeDashboard V2')
    console.log(`[RevalidationService] Purging customer dashboard cache views for customer ID: ${customerId}`)
    await this.executeRevalidation({ type: 'dashboard', customerId }, () => {
      revalidateTag(`dashboard-customer-${customerId}`, {})
      revalidateTag(`bookings-customer-${customerId}`, {})
      revalidateTag(`ledger-customer-${customerId}`, {})
      revalidatePath('/dashboard')
      revalidatePath('/dashboard/bookings')
      revalidatePath('/dashboard/loyalty')
    }, options)
  }

  public static async purgeContent(slug: string, options?: { forceLocal?: boolean }): Promise<void> {
    console.log(`[RevalidationService] Purging content page: ${slug}`)
    await this.executeRevalidation({ type: 'content', pageSlug: slug }, () => {
      revalidateTag('content', {})
      revalidateTag(`page-${slug}`, {})
      revalidatePath(`/${slug}`)
    }, options)
  }

  public static async purgeBlog(slug: string, options?: { forceLocal?: boolean }): Promise<void> {
    console.log(`[RevalidationService] Purging blog articles and dynamic post: ${slug}`)
    await this.executeRevalidation({ type: 'content', pageSlug: `blog-${slug}` }, () => {
      revalidateTag('blog', {})
      revalidateTag(`post-${slug}`, {})
      revalidatePath('/blog')
      revalidatePath(`/blog/${slug}`)
    }, options)
  }
}
