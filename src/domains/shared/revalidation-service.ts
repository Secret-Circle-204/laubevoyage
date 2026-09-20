import { revalidateTag, revalidatePath } from 'next/cache'

console.log('[RevalidationService VERSION] REMOTE-BOUNDARY-V2')

export type RevalidationFailureCode =
  | 'UNAUTHORIZED'
  | 'REMOTE_SERVER_ERROR'
  | 'REMOTE_REJECTED'
  | 'NETWORK_ERROR'
  | 'INVALID_RESPONSE'
  | 'MISSING_CONFIGURATION'
  | 'LOCAL_REVALIDATION_UNAVAILABLE'

export interface RevalidationResult {
  success: boolean
  code?: RevalidationFailureCode
  status?: number
  message?: string
  mode: 'local' | 'remote' | 'skipped'
}

/**
 * Next.js Presentation Cache Revalidation Service
 * Provides static helper methods to purge Next.js ISR HTML and Data caches on-demand.
 * Dynamically detects missing React/Next request context (e.g. inside background workers)
 * and dispatches revalidation requests securely via HTTP to the internal API route.
 */
export class RevalidationService {
  private static async executeRevalidation(
    payload: {
      type:
        | 'dashboard'
        | 'experience'
        | 'destination'
        | 'layout'
        | 'content'
        | 'translation'
        | 'currencies'
      customerId?: number
      slices?: ('loyalty' | 'trips' | 'customer' | 'security')[]
      experienceSlug?: string
      countrySlug?: string
      citySlug?: string
      pageSlug?: string
      originalHash?: string
      language?: string
    },
    localActions: () => void,
    options?: { forceLocal?: boolean },
  ): Promise<RevalidationResult> {
    try {
      localActions()
      return { success: true, mode: 'local' }
    } catch (err: any) {
      const isStoreMissing =
        err?.message?.includes('static generation store') ||
        err?.message?.includes('static generation') ||
        err?.message?.includes('Invariant')
      if (isStoreMissing && !options?.forceLocal) {
        return await this.triggerRemoteRevalidate(payload)
      } else {
        console.error(
          `[RevalidationService] Local revalidation failed for type ${payload.type}:`,
          err,
        )
        return {
          success: false,
          code: 'LOCAL_REVALIDATION_UNAVAILABLE',
          message: err instanceof Error ? err.message : String(err),
          mode: 'local',
        }
      }
    }
  }

  private static async triggerRemoteRevalidate(
    payload: Record<string, any>,
  ): Promise<RevalidationResult> {
    const isProduction = process.env.NODE_ENV === 'production'
    const appUrl = isProduction
      ? process.env.INTERNAL_APP_URL
      : process.env.INTERNAL_APP_URL || 'http://127.0.0.1:3000'

    if (isProduction && !appUrl) {
      console.error('[RevalidationService] Missing mandatory INTERNAL_APP_URL in production.')
      return {
        success: false,
        code: 'MISSING_CONFIGURATION',
        message: 'INTERNAL_APP_URL is required in production.',
        mode: 'remote',
      }
    }

    const secret = process.env.INTERNAL_REVALIDATION_TOKEN
    if (isProduction && (!secret || secret === 'laube-internal-token-2026')) {
      console.error(
        '[RevalidationService] Missing or placeholder INTERNAL_REVALIDATION_TOKEN in production.',
      )
      return {
        success: false,
        code: 'MISSING_CONFIGURATION',
        message: 'INTERNAL_REVALIDATION_TOKEN must be configured in production.',
        mode: 'remote',
      }
    }

    console.log(
      `[RevalidationService] Dispatching remote revalidation for:`,
      JSON.stringify(payload),
    )
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
        console.error(
          `[RevalidationService] Remote revalidation failed (HTTP ${res.status}): ${text}`,
        )
        return {
          success: false,
          code: res.status === 401 ? 'UNAUTHORIZED' : 'REMOTE_SERVER_ERROR',
          status: res.status,
          message: `Remote revalidation failed with HTTP ${res.status}`,
          mode: 'remote',
        }
      }

      let data: any
      try {
        data = await res.json()
      } catch {
        console.error('[RevalidationService] Remote revalidation returned non-JSON response.')
        return {
          success: false,
          code: 'INVALID_RESPONSE',
          status: res.status,
          message: 'Malformed response from revalidation endpoint.',
          mode: 'remote',
        }
      }

      if (!data.success) {
        console.error(`[RevalidationService] Remote revalidation returned error:`, data.error)
        return {
          success: false,
          code: 'REMOTE_REJECTED',
          status: res.status,
          message: data.error || 'Revalidation rejected by endpoint',
          mode: 'remote',
        }
      }

      console.log(`[RevalidationService] Remote revalidation succeeded.`)
      return { success: true, mode: 'remote' }
    } catch (fetchErr: any) {
      console.error(`[RevalidationService] Failed dispatching remote revalidation fetch:`, fetchErr)
      return {
        success: false,
        code: 'NETWORK_ERROR',
        message: fetchErr instanceof Error ? fetchErr.message : String(fetchErr),
        mode: 'remote',
      }
    }
  }

  public static async purgeCurrencies(options?: { forceLocal?: boolean }): Promise<RevalidationResult> {
    console.log('[RevalidationService] Purging targeted currencies cache tag (currencies)')
    return await this.executeRevalidation(
      { type: 'currencies' },
      () => {
        revalidateTag('currencies', {})
      },
      options,
    )
  }

  public static async purgeLayout(options?: { forceLocal?: boolean }): Promise<RevalidationResult> {
    console.log('[RevalidationService] Purging layout tags (system-settings, currencies)')
    return await this.executeRevalidation(
      { type: 'layout' },
      () => {
        revalidateTag('system-settings', {})
        revalidateTag('currencies', {})
        revalidateTag('exchange-rates', {})
      },
      options,
    )
  }

  public static async purgeExperiences(options?: { forceLocal?: boolean }): Promise<RevalidationResult> {
    console.log('[RevalidationService] Purging experiences listing catalog')
    return await this.executeRevalidation(
      { type: 'experience', experienceSlug: 'all' },
      () => {
        revalidateTag('experiences', {})
        revalidatePath('/experiences')
      },
      options,
    )
  }

  public static async purgeExperienceSlug(
    slug: string,
    options?: { forceLocal?: boolean },
  ): Promise<RevalidationResult> {
    console.log(`[RevalidationService] Purging experience detail for slug: ${slug}`)
    return await this.executeRevalidation(
      { type: 'experience', experienceSlug: slug },
      () => {
        revalidateTag(`experience-${slug}`, {})
        revalidateTag(`slots-${slug}`, {})
        revalidatePath(`/experiences/${slug}`)
      },
      options,
    )
  }

  public static async purgeDestinations(options?: { forceLocal?: boolean }): Promise<RevalidationResult> {
    console.log('[RevalidationService] Purging destinations catalogs')
    return await this.executeRevalidation(
      { type: 'destination' },
      () => {
        revalidateTag('destinations', {})
        revalidatePath('/destinations')
      },
      options,
    )
  }

  public static async purgeCountrySlug(
    countrySlug: string,
    options?: { forceLocal?: boolean },
  ): Promise<RevalidationResult> {
    console.log(`[RevalidationService] Purging country destinations for slug: ${countrySlug}`)
    return await this.executeRevalidation(
      { type: 'destination', countrySlug },
      () => {
        revalidateTag(`destination-${countrySlug}`, {})
        revalidatePath(`/destinations/${countrySlug}`)
      },
      options,
    )
  }

  public static async purgeCitySlug(
    countrySlug: string,
    citySlug: string,
    options?: { forceLocal?: boolean },
  ): Promise<RevalidationResult> {
    console.log(
      `[RevalidationService] Purging city layout for city: ${citySlug} in country: ${countrySlug}`,
    )
    return await this.executeRevalidation(
      { type: 'destination', countrySlug, citySlug },
      () => {
        revalidateTag(`city-${citySlug}`, {})
        revalidatePath(`/destinations/${countrySlug}/${citySlug}`)
      },
      options,
    )
  }

  public static async purgeDashboardSlices(
    customerId: number,
    slices: ('loyalty' | 'trips' | 'customer' | 'security')[],
    options?: { forceLocal?: boolean },
  ): Promise<RevalidationResult> {
    console.log(
      `[RevalidationService] Purging targeted dashboard slices for customer ID: ${customerId} (Slices: ${slices.join(', ')})`,
    )
    return await this.executeRevalidation(
      { type: 'dashboard', customerId, slices },
      () => {
        // Overview is always refreshed for the customer who triggered the update
        revalidateTag(`dashboard-customer-${customerId}`, {})
        revalidatePath('/dashboard')

        if (slices.includes('loyalty')) {
          console.log(
            `[RevalidationService] -> Purging loyalty view & tags for customer #${customerId}`,
          )
          revalidateTag(`ledger-customer-${customerId}`, {})
          revalidatePath('/dashboard/loyalty')
        }

        if (slices.includes('trips')) {
          console.log(
            `[RevalidationService] -> Purging trips/bookings view & tags for customer #${customerId}`,
          )
          revalidateTag(`bookings-customer-${customerId}`, {})
          revalidatePath('/dashboard/bookings')
        }

        if (slices.includes('customer')) {
          console.log(
            `[RevalidationService] -> Purging profile view & tags for customer #${customerId}`,
          )
          revalidateTag(`profile-customer-${customerId}`, {})
          revalidatePath('/dashboard/profile')
        }

        if (slices.includes('security')) {
          console.log(`[RevalidationService] -> Purging security tags for customer #${customerId}`)
          revalidateTag(`security-customer-${customerId}`, {})
        }
      },
      options,
    )
  }

  public static async purgeDashboard(
    customerId: number,
    options?: { forceLocal?: boolean },
  ): Promise<RevalidationResult> {
    console.log('[RevalidationService] purgeDashboard (Full Invalidation)')
    console.log(
      `[RevalidationService] Purging all customer dashboard views for customer ID: ${customerId}`,
    )
    return await this.executeRevalidation(
      { type: 'dashboard', customerId },
      () => {
        revalidateTag(`dashboard-customer-${customerId}`, {})
        revalidateTag(`bookings-customer-${customerId}`, {})
        revalidateTag(`ledger-customer-${customerId}`, {})
        revalidateTag(`profile-customer-${customerId}`, {})
        revalidatePath('/dashboard')
        revalidatePath('/dashboard/bookings')
        revalidatePath('/dashboard/loyalty')
        revalidatePath('/dashboard/profile')
      },
      options,
    )
  }

  public static async purgeContent(
    slug: string,
    options?: { forceLocal?: boolean },
  ): Promise<RevalidationResult> {
    console.log(`[RevalidationService] Purging content page: ${slug}`)
    return await this.executeRevalidation(
      { type: 'content', pageSlug: slug },
      () => {
        revalidateTag('content', {})
        revalidateTag(`page-${slug}`, {})
        revalidatePath(`/${slug}`)
      },
      options,
    )
  }

  public static async purgeBlog(slug: string, options?: { forceLocal?: boolean }): Promise<RevalidationResult> {
    console.log(`[RevalidationService] Purging blog articles and dynamic post: ${slug}`)
    return await this.executeRevalidation(
      { type: 'content', pageSlug: `blog-${slug}` },
      () => {
        revalidateTag('blog', {})
        revalidateTag(`post-${slug}`, {})
        revalidatePath('/blog')
        revalidatePath(`/blog/${slug}`)
      },
      options,
    )
  }

  public static async purgeTranslation(
    originalHash: string,
    language: string,
    options?: { forceLocal?: boolean },
  ): Promise<RevalidationResult> {
    console.log(
      `[RevalidationService] Purging targeted translation: [${originalHash}] (${language})`,
    )
    return await this.executeRevalidation(
      { type: 'translation', originalHash, language },
      () => {
        // Local revalidation can purge tags if applicable
      },
      options,
    )
  }
}
