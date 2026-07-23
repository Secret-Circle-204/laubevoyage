import { NextRequest, NextResponse } from 'next/server'
import { getDomainServices } from '@/domains/factory'

/**
 * GET /api/destinations/countries
 * Get all active countries
 */
export async function GET(request: NextRequest) {
  try {
    const services = await getDomainServices()
    const countries = await services.destination.getCountries()

    return NextResponse.json(countries)
  } catch (error) {
    console.error('Error fetching countries:', error)
    return NextResponse.json({ error: 'Failed to fetch countries' }, { status: 500 })
  }
}
