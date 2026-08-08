import { NextRequest, NextResponse } from 'next/server'
import { RevalidationService } from '@/domains/shared/revalidation-service'

export async function POST(req: NextRequest) {
  try {
    const { token, type, customerId, experienceSlug, countrySlug, citySlug, pageSlug } = await req.json()

    const secret = process.env.INTERNAL_REVALIDATION_TOKEN
    const isProduction = process.env.NODE_ENV === 'production'

    if (isProduction && (!secret || secret === 'laube-internal-token-2026')) {
      throw new Error('[SECURITY CRITICAL] INTERNAL_REVALIDATION_TOKEN must be a secure random secret in production.')
    }

    const activeToken = secret || 'laube-internal-token-2026'
    if (token !== activeToken) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Predefined restricted revalidation types only
    if (type === 'dashboard') {
      if (!customerId) return NextResponse.json({ success: false, error: 'Missing customerId' }, { status: 400 })
      console.log(`[API Revalidate] Purging customer dashboard for ID: ${customerId}`)
      await RevalidationService.purgeDashboard(Number(customerId), { forceLocal: true })
    } else if (type === 'experience') {
      if (!experienceSlug) return NextResponse.json({ success: false, error: 'Missing experienceSlug' }, { status: 400 })
      console.log(`[API Revalidate] Purging experience: ${experienceSlug}`)
      if (experienceSlug === 'all') {
        await RevalidationService.purgeExperiences({ forceLocal: true })
      } else {
        await RevalidationService.purgeExperienceSlug(experienceSlug, { forceLocal: true })
      }
    } else if (type === 'destination') {
      console.log('[API Revalidate] Purging destinations')
      if (!countrySlug) {
        await RevalidationService.purgeDestinations({ forceLocal: true })
      } else if (!citySlug) {
        await RevalidationService.purgeCountrySlug(countrySlug, { forceLocal: true })
      } else {
        await RevalidationService.purgeCitySlug(countrySlug, citySlug, { forceLocal: true })
      }
    } else if (type === 'layout') {
      console.log('[API Revalidate] Purging layout')
      await RevalidationService.purgeLayout({ forceLocal: true })
    } else if (type === 'content') {
      if (!pageSlug) return NextResponse.json({ success: false, error: 'Missing pageSlug' }, { status: 400 })
      console.log(`[API Revalidate] Purging page content: ${pageSlug}`)
      if (pageSlug.startsWith('blog-')) {
        const blogSlug = pageSlug.substring(5)
        await RevalidationService.purgeBlog(blogSlug, { forceLocal: true })
      } else {
        await RevalidationService.purgeContent(pageSlug, { forceLocal: true })
      }
    } else {
      return NextResponse.json({ success: false, error: `Invalid revalidation type: ${type}` }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[API Revalidate] Internal Error:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
