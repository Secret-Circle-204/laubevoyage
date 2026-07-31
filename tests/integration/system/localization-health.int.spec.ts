import { describe, it, expect } from 'vitest'
import { GET } from '@/app/api/internal/health/localization/route'
import { NextRequest } from 'next/server'

describe('Localization Health Check API Handler Integration Test', () => {
  it('should successfully run active verification and return PASS status with details', async () => {
    const req = new NextRequest('http://localhost:3000/api/internal/health/localization')
    const response = await GET(req)
    
    expect(response.status).toBe(200)
    const body = await response.json()
    
    expect(body.status).toBe('PASS')
    expect(body.checks.databaseConfig).toBe('PASS')
    expect(body.checks.resolutionCascade).toBe('PASS')
    expect(body.checks.pricingConversion).toBe('PASS')
    expect(body.details.activeCurrencies.length).toBeGreaterThan(0)
    expect(body.details.verifiedConversions.length).toBeGreaterThan(0)
  })
})
