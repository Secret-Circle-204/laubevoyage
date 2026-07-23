import { describe, it, expect } from 'vitest'
import { PricingPipelineEngine } from '@/domains/currency/pipeline'

describe('Experience / Currency Domain: Pricing Pipeline Engine Unit Tests', () => {
  it('should generate versioned PricingSnapshotData with full auditTrace', async () => {
    const pipeline = new PricingPipelineEngine()

    const snapshot = await pipeline.calculatePricingSnapshot(2000, {
      departureId: 'dep_101',
      experienceId: 1,
      displayCurrency: 'USD',
      travelers: { adults: 1, children: 0 },
      bookingDate: '2026-08-03',
    })

    expect(snapshot.snapshotId).toContain('snap_')
    expect(snapshot.snapshotVersion).toBe('v1')
    expect(snapshot.displayCurrency).toBe('USD')
    expect(snapshot.displayAmount).toBeGreaterThan(0)
    expect(snapshot.auditTrace.length).toBeGreaterThanOrEqual(2)
  })
})
