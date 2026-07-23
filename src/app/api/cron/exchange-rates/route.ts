import { NextRequest, NextResponse } from 'next/server'
import { getDomainServices } from '@/domains/factory'
import { OpenExchangeProvider } from '@/domains/currency/providers/openexchange'
import { rateRegistry } from '@/domains/currency/rate-registry'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { currency: currencyService } = await getDomainServices()
    const provider = new OpenExchangeProvider()

    let rates: Record<string, number> = {}
    let source: 'OpenExchange' | 'ECB' | 'Fixer' | 'Manual' = 'OpenExchange'
    let syncStatus: 'synced' | 'failed' | 'stale' = 'synced'

    try {
      rates = await provider.fetchRates('EGP')
    } catch (primaryError) {
      console.error('[Exchange Rate Cron] Primary Provider Failed:', primaryError)

      const primaryMsg = primaryError instanceof Error ? primaryError.message : String(primaryError)
      const attemptTime = new Date().toISOString()

      try {
        await currencyService.markAllStale(primaryMsg, attemptTime)
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

    let updated = 0
    const now = new Date().toISOString()

    for (const [currency, rate] of Object.entries(rates)) {
      if (!rate) continue

      await currencyService.upsertRate({
        fromCurrency: 'EGP',
        toCurrency: currency,
        rate,
        source,
        syncStatus,
        timestamp: now,
      })
      updated++
    }

    rateRegistry.invalidate()

    return NextResponse.json({
      success: true,
      message: `Updated ${updated} exchange rates`,
      timestamp: now,
    })
  } catch (error) {
    console.error('[Exchange Rate Cron] Fatal Error:', error)
    return NextResponse.json({ error: 'Fatal error executing cron' }, { status: 500 })
  }
}
