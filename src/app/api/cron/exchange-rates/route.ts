import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { OpenExchangeProvider } from '@/domains/currency/providers/openexchange'
import { rateRegistry } from '@/domains/currency/rate-registry'

/**
 * Exchange Rate Scheduler — Cron Endpoint (Omnivorous & Resilient)
 *
 * This endpoint fetches ALL rates from the provider and upserts them.
 * Fallback Policy:
 * 1. Try Provider 1
 * 2. On failure, Try Provider 2 (mocked/omitted for now, represented by a try/catch)
 * 3. On total failure: KEEP old rates. Never set to null. Alert admin.
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = await getPayload({ config })
    const provider = new OpenExchangeProvider()

    let rates: Record<string, number> = {}
    let source: 'OpenExchange' | 'ECB' | 'Fixer' | 'Manual' = 'OpenExchange'
    let syncStatus: 'synced' | 'failed' | 'stale' = 'synced'
    let lastError: Date | undefined = undefined

    try {
      // 1. Try Primary Provider
      rates = await provider.fetchRates('EGP')
    } catch (primaryError) {
      console.error('[Exchange Rate Cron] Primary Provider Failed:', primaryError)
      
      try {
        // 2. Try Secondary Provider (Fallback) - Simulated here
        // rates = await secondaryProvider.fetchRates('EGP')
        // source = 'ECB'
        throw new Error('Secondary Provider not implemented yet')
      } catch (secondaryError) {
        console.error('[Exchange Rate Cron] Secondary Provider Failed:', secondaryError)
        
        // 3. Absolute Failure: KEEP OLD RATES but mark as STALE
        console.error('CRITICAL: All providers failed. Keeping old rates intact but marking as STALE.')
        
        const primaryMsg = primaryError instanceof Error ? primaryError.message : String(primaryError)
        const secondaryMsg = secondaryError instanceof Error ? secondaryError.message : String(secondaryError)
        const errorMessage = primaryMsg || secondaryMsg || 'Unknown timeout or connection error'
        const attemptTime = new Date().toISOString()

        try {
          // Find all existing rates and mark their syncStatus as 'stale'
          const existingRates = await payload.find({
            collection: 'exchange-rates',
            limit: 1000,
            depth: 0,
          })

          for (const doc of existingRates.docs) {
            await payload.update({
              collection: 'exchange-rates',
              id: doc.id,
              data: {
                syncStatus: 'stale',
                lastAttempt: attemptTime,
                lastError: errorMessage,
              },
            })
          }
          
          // Invalidate registry so next request sees 'stale' status if they check it
          rateRegistry.invalidate()
        } catch (dbError) {
          console.error('Failed to mark rates as stale:', dbError)
        }

        return NextResponse.json({
          success: false,
          message: 'All providers failed. Kept old rates but marked as STALE.',
          timestamp: attemptTime,
        })
      }
    }

    let updated = 0
    const now = new Date().toISOString()

    // 4. Omnivorous Update: Update ALL currencies returned by the provider (170+)
    for (const [currency, rate] of Object.entries(rates)) {
      if (!rate) continue

      const existing = await payload.find({
        collection: 'exchange-rates',
        where: {
          and: [
            { fromCurrency: { equals: 'EGP' } },
            { toCurrency: { equals: currency } },
          ],
        },
        limit: 1,
      })

      if (existing.docs.length > 0) {
        await payload.update({
          collection: 'exchange-rates',
          id: existing.docs[0].id,
          data: {
            rate,
            source,
            lastUpdate: now,
            lastSuccess: now,
            lastAttempt: now,
            lastError: null,
            syncStatus,
          },
        })
      } else {
        await payload.create({
          collection: 'exchange-rates',
          data: {
            fromCurrency: 'EGP',
            toCurrency: currency,
            rate,
            source,
            lastUpdate: now,
            lastSuccess: now,
            lastAttempt: now,
            lastError: null,
            syncStatus,
          },
        })
      }
      updated++
    }

    // 5. Invalidate Rate Registry (will reload on next request)
    rateRegistry.invalidate()

    return NextResponse.json({
      success: true,
      message: `Updated ${updated} exchange rates`,
      timestamp: now,
    })
  } catch (error) {
    console.error('[Exchange Rate Cron] Fatal Error:', error)
    return NextResponse.json(
      { error: 'Fatal error executing cron' },
      { status: 500 },
    )
  }
}
