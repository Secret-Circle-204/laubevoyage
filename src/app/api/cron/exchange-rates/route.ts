import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { OpenExchangeProvider } from '@/domains/currency/providers/openexchange'

/**
 * Exchange Rate Scheduler — Cron Endpoint
 *
 * This endpoint is called by an external scheduler (e.g. Vercel Cron, GitHub Actions)
 * to update exchange rates in the database hourly.
 *
 * Security: Protected by a CRON_SECRET token.
 *
 * The application NEVER calls external exchange APIs per-request.
 * All rate lookups read from the local database only.
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = await getPayload({ config })
    const provider = new OpenExchangeProvider()

    // Fetch latest rates with EGP as base
    const rates = await provider.fetchRates('EGP')

    const targetCurrencies = ['USD', 'EUR', 'AED', 'SAR']
    let updated = 0

    for (const currency of targetCurrencies) {
      const rate = rates[currency]
      if (!rate) continue

      // Find existing rate record
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
        // Update existing record
        await payload.update({
          collection: 'exchange-rates',
          id: existing.docs[0].id,
          data: {
            rate,
            isActive: true,
          },
        })
      } else {
        // Create new record
        await payload.create({
          collection: 'exchange-rates',
          data: {
            fromCurrency: 'EGP' as const,
            toCurrency: currency as 'EGP' | 'USD' | 'EUR' | 'AED' | 'SAR',
            rate,
            isActive: true,
          },
        })
      }

      updated++
    }

    return NextResponse.json({
      success: true,
      message: `Updated ${updated} exchange rates`,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[Exchange Rate Cron] Failed:', error)
    return NextResponse.json(
      { error: 'Failed to update exchange rates' },
      { status: 500 },
    )
  }
}
