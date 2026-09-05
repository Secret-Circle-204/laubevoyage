import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Currencies } from '@/collections/Currencies'
import { EventBus } from '@/domains/events/event-bus'
import { CacheInvalidationCoordinator } from '@/domains/events/coordination/cache-coordinator'

describe('Currencies Collection Hooks: Distributed Invalidation & Event Propagation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('afterChange MUST publish local CURRENCY_CATALOG_UPDATED and broadcast distributed currency invalidation', async () => {
    const eventBusPublishSpy = vi.spyOn(EventBus.getInstance(), 'publish').mockResolvedValue(undefined as any)
    const mockPublish = vi.fn().mockResolvedValue(undefined)

    vi.spyOn(CacheInvalidationCoordinator, 'getInstance').mockReturnValue({
      publish: mockPublish,
    } as any)

    const mockDbTx = { query: vi.fn() }
    const mockReq = {
      payload: {
        db: {
          sessions: {
            tx_123: mockDbTx,
          },
        },
      },
      transactionID: 'tx_123',
    }

    const doc = { id: 'curr_jpy_1', isoCode: 'JPY', isActive: true }
    const hook = Currencies.hooks?.afterChange?.[0]
    expect(hook).toBeDefined()

    const result = await hook!({ doc, req: mockReq as any, operation: 'update', previousDoc: {} } as any)

    expect(result).toEqual(doc)
    expect(eventBusPublishSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'CURRENCY_CATALOG_UPDATED',
        eventId: expect.stringContaining('evt_curr_curr_jpy_1'),
      }),
    )
    expect(mockPublish).toHaveBeenCalledWith({ type: 'currency' }, mockDbTx)
  })

  it('afterDelete MUST publish local CURRENCY_CATALOG_UPDATED and broadcast distributed currency invalidation', async () => {
    const eventBusPublishSpy = vi.spyOn(EventBus.getInstance(), 'publish').mockResolvedValue(undefined as any)
    const mockPublish = vi.fn().mockResolvedValue(undefined)

    vi.spyOn(CacheInvalidationCoordinator, 'getInstance').mockReturnValue({
      publish: mockPublish,
    } as any)

    const mockDbTx = { query: vi.fn() }
    const mockReq = {
      payload: {
        db: {
          sessions: {
            tx_456: mockDbTx,
          },
        },
      },
      transactionID: 'tx_456',
    }

    const doc = { id: 'curr_cad_2', isoCode: 'CAD' }
    const hook = Currencies.hooks?.afterDelete?.[0]
    expect(hook).toBeDefined()

    const result = await hook!({ doc, req: mockReq as any } as any)

    expect(result).toEqual(doc)
    expect(eventBusPublishSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'CURRENCY_CATALOG_UPDATED',
        eventId: expect.stringContaining('evt_curr_del_curr_cad_2'),
      }),
    )
    expect(mockPublish).toHaveBeenCalledWith({ type: 'currency' }, mockDbTx)
  })

  it('afterChange MUST NOT throw if distributed invalidation fails', async () => {
    vi.spyOn(EventBus.getInstance(), 'publish').mockResolvedValue(undefined as any)
    vi.spyOn(CacheInvalidationCoordinator, 'getInstance').mockReturnValue({
      publish: vi.fn().mockRejectedValue(new Error('Network partition')),
    } as any)

    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const doc = { id: 'curr_jpy_1', isoCode: 'JPY', isActive: true }
    const hook = Currencies.hooks?.afterChange?.[0]

    const result = await hook!({ doc, req: {} as any, operation: 'update', previousDoc: {} } as any)

    expect(result).toEqual(doc)
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('[Currencies Hook] Distributed currency catalog cache invalidation failed:'),
      'Network partition',
    )
  })
})
