import { NextRequest, NextResponse } from 'next/server'
import { getDomainServices } from '@/domains/factory'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    // Fail-Closed: Require valid CRON_SECRET in environment and matching Bearer token
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { currency: currencyService } = await getDomainServices()
    const result = await currencyService.syncExchangeRates()

    return NextResponse.json(result, { status: result.success ? 200 : 500 })
  } catch (error: unknown) {
    console.error('[Exchange Rate Cron] Fatal Error:', error)
    return NextResponse.json({ error: 'Fatal error executing cron' }, { status: 500 })
  }
}
