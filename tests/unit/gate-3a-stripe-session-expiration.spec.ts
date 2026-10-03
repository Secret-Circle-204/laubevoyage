import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BookingStatus } from '@/types'
import { PaymentService } from '@/domains/payment/service'
import { PaymentRepository } from '@/domains/payment/repository'
import { StripePaymentAdapter } from '@/domains/payment/adapters/stripe'
import { BNPLPaymentAdapter } from '@/domains/payment/adapters/bnpl'
import { BookingExpiration } from '@/domains/booking/expiration'
import type { PaymentAggregate } from '@/domains/payment/aggregate'
import type { BookingAggregate } from '@/domains/booking/types'

// Mock currency rounding
vi.mock('@/domains/currency/rounding', () => ({
  fromSmallestUnit: vi.fn(async (amt: number) => amt / 100),
  toSmallestUnit: vi.fn(async (amt: number) => amt * 100),
  roundForCurrency: vi.fn(async (amt: number) => amt),
  getCurrencyDecimals: vi.fn(async () => 2),
}))

// Mock Stripe SDK
const mockStripeSessionsExpire = vi.fn()
vi.mock('@/lib/stripe', () => ({
  stripe: {
    checkout: {
      sessions: {
        expire: (...args: any[]) => mockStripeSessionsExpire(...args),
      },
    },
  },
}))

describe('Gate 3A: Stripe Checkout Session Expiration on Booking Expiry', () => {
  let mockPaymentRepo: PaymentRepository
  let paymentService: PaymentService
  let transactions: Map<string, PaymentAggregate>
  let txByBookingId: Map<number, PaymentAggregate>
  let auditLogs: { transactionId: string; record: any }[]

  const createMockTransaction = (overrides?: Partial<PaymentAggregate>): PaymentAggregate => ({
    transactionId: overrides?.transactionId || 'tx_test_3a_1',
    bookingId: overrides?.bookingId || 101,
    customerId: overrides?.customerId || 501,
    version: 1,
    provider: overrides?.provider || 'stripe',
    status: overrides?.status || 'initiated',
    session: overrides?.session !== undefined ? overrides.session : {
      sessionId: 'cs_test_gate3a_session',
      url: 'https://checkout.stripe.com/pay/cs_test_gate3a_session',
    },
    attempts: overrides?.attempts || [
      {
        attemptId: 'att_3a_1',
        attemptNumber: 1,
        provider: overrides?.provider || 'stripe',
        amount: 5000,
        currency: 'EGP',
        status: 'initiated',
        transactionReference: 'cs_test_gate3a_session',
        timestamp: new Date().toISOString(),
      },
    ],
    webhookLedger: overrides?.webhookLedger || [],
    auditTrail: [],
    gatewayReference: 'cs_test_gate3a_session',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })

  beforeEach(() => {
    vi.restoreAllMocks()
    mockStripeSessionsExpire.mockClear()
    transactions = new Map()
    txByBookingId = new Map()
    auditLogs = []

    mockPaymentRepo = {
      findByBookingId: vi.fn(async (bookingId: number) => txByBookingId.get(bookingId) || null),
      findByTransactionId: vi.fn(async (txId: string) => transactions.get(txId) || null),
      updateStatus: vi.fn(async (txId: string, status: any, context?: any, auditRecord?: any, expectedVersion?: number) => {
        const tx = transactions.get(txId)
        if (tx) {
          if (expectedVersion !== undefined && tx.version !== expectedVersion) {
            throw new Error(`[PaymentRepository] Optimistic lock conflict: Transaction ${txId} version mismatch (expected version ${expectedVersion}). Concurrency conflict prevented lost update.`)
          }
          tx.status = status
          tx.version = (expectedVersion !== undefined ? expectedVersion : tx.version) + 1
          if (auditRecord) {
            tx.auditTrail.push(auditRecord)
            auditLogs.push({ transactionId: txId, record: auditRecord })
          }
          tx.updatedAt = new Date().toISOString()
        }
      }),
      appendAudit: vi.fn(async (txId: string, record: any, context?: any, expectedVersion?: number) => {
        const tx = transactions.get(txId)
        if (tx) {
          if (expectedVersion !== undefined && tx.version !== expectedVersion) {
            throw new Error(`[PaymentRepository] Optimistic lock conflict: Transaction ${txId} version mismatch (expected version ${expectedVersion}) while appending audit record. Concurrency conflict prevented lost update.`)
          }
          tx.version = (expectedVersion !== undefined ? expectedVersion : tx.version) + 1
          tx.auditTrail.push(record)
          auditLogs.push({ transactionId: txId, record })
        }
      }),
    } as unknown as PaymentRepository

    paymentService = new PaymentService(
      mockPaymentRepo,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    )
  })

  describe('StripePaymentAdapter.expireSession Error Classification & Contracts', () => {
    it('returns outcome: expired_successfully when Stripe API succeeds', async () => {
      mockStripeSessionsExpire.mockResolvedValueOnce({ id: 'cs_test_open', status: 'expired' })

      const adapter = new StripePaymentAdapter()
      const result = await adapter.expireSession('cs_test_open')

      expect(mockStripeSessionsExpire).toHaveBeenCalledWith('cs_test_open')
      expect(result).toEqual({
        success: true,
        outcome: 'expired_successfully',
        sessionId: 'cs_test_open',
      })
    })

    it('returns outcome: already_expired for EXACT real Stripe production message observed on VPS', async () => {
      // The exact error string observed from live Stripe API on VPS:
      mockStripeSessionsExpire.mockRejectedValueOnce({
        message: "Only Checkout Sessions with a status in ['open'] can be expired. This Checkout Session has a status of expired.",
        type: 'StripeInvalidRequestError',
        statusCode: 400,
      })

      const adapter = new StripePaymentAdapter()
      const result = await adapter.expireSession('cs_test_vps_real')

      expect(result).toEqual({
        success: true,
        outcome: 'already_expired',
        sessionId: 'cs_test_vps_real',
      })
    })

    it('returns outcome: already_expired for double-quote and legacy message variants', async () => {
      mockStripeSessionsExpire.mockRejectedValueOnce({
        message: 'Only Checkout Sessions with a status in ["open"] can be expired. This Checkout Session has a status of `expired`.',
        type: 'invalid_request_error',
        statusCode: 400,
      })

      const adapter = new StripePaymentAdapter()
      const result1 = await adapter.expireSession('cs_test_quotes_var')
      expect(result1.outcome).toBe('already_expired')

      // Legacy variant
      mockStripeSessionsExpire.mockRejectedValueOnce({
        message: 'This Checkout Session is already expired.',
        statusCode: 400,
      })
      const result2 = await adapter.expireSession('cs_test_legacy')
      expect(result2.outcome).toBe('already_expired')
    })

    it('returns outcome: concurrent_payment_complete for EXACT real Stripe complete response', async () => {
      // Real Stripe response when customer paid concurrently:
      mockStripeSessionsExpire.mockRejectedValueOnce({
        message: "Only Checkout Sessions with a status in ['open'] can be expired. This Checkout Session has a status of complete.",
        type: 'StripeInvalidRequestError',
        statusCode: 400,
      })

      const adapter = new StripePaymentAdapter()
      const result = await adapter.expireSession('cs_test_complete')

      expect(result).toEqual({
        success: false,
        outcome: 'concurrent_payment_complete',
        sessionId: 'cs_test_complete',
        errorDetails: "Only Checkout Sessions with a status in ['open'] can be expired. This Checkout Session has a status of complete.",
      })
    })

    it('returns outcome: resource_missing when Stripe returns structured 404 or resource_missing code', async () => {
      mockStripeSessionsExpire.mockRejectedValueOnce({
        message: 'No such checkout.session: cs_test_not_found',
        code: 'resource_missing',
        statusCode: 404,
      })

      const adapter = new StripePaymentAdapter()
      const result = await adapter.expireSession('cs_test_not_found')

      expect(result).toEqual({
        success: false,
        outcome: 'resource_missing',
        sessionId: 'cs_test_not_found',
        errorDetails: 'No such checkout.session: cs_test_not_found',
      })
    })

    it('returns outcome: network_error when Stripe has generic connection or API failure', async () => {
      mockStripeSessionsExpire.mockRejectedValueOnce(new Error('Connection timeout to Stripe API'))

      const adapter = new StripePaymentAdapter()
      const result = await adapter.expireSession('cs_test_timeout')

      expect(result).toEqual({
        success: false,
        outcome: 'network_error',
        sessionId: 'cs_test_timeout',
        errorDetails: 'Connection timeout to Stripe API',
      })
    })

    it('preserves cancelSession boolean contract for backwards compatibility', async () => {
      const adapter = new StripePaymentAdapter()

      mockStripeSessionsExpire.mockResolvedValueOnce({ id: 'cs_cancel_ok' })
      const ok = await adapter.cancelSession('cs_cancel_ok')
      expect(ok).toBe(true)

      mockStripeSessionsExpire.mockRejectedValueOnce(new Error('Stripe API error'))
      const fail = await adapter.cancelSession('cs_cancel_fail')
      expect(fail).toBe(false)
    })
  })

  describe('Scenario A: Expired booking with OPEN Stripe session', () => {
    it('requests Stripe session expiration, marks transaction failed atomically with audit', async () => {
      const tx = createMockTransaction({ bookingId: 101, status: 'initiated' })
      transactions.set(tx.transactionId, tx)
      txByBookingId.set(101, tx)

      mockStripeSessionsExpire.mockResolvedValueOnce({ id: tx.session!.sessionId, status: 'expired' })

      const res = await paymentService.expireSessionForBooking(101)

      expect(res.attempted).toBe(true)
      expect(res.outcome).toBe('expired_successfully')
      expect(mockStripeSessionsExpire).toHaveBeenCalledWith(tx.session!.sessionId)

      // Verified atomic call with audit record and expectedVersion (OCC)
      expect(mockPaymentRepo.updateStatus).toHaveBeenCalledWith(
        tx.transactionId,
        'failed',
        undefined,
        expect.objectContaining({
          action: 'EXPIRE_GATEWAY_SESSION',
          newState: 'failed',
          reason: expect.stringContaining('expired_successfully'),
        }),
        1,
      )

      expect(auditLogs).toHaveLength(1)
      expect(tx.status).toBe('failed')
    })
  })

  describe('Scenario B: Expired booking with already EXPIRED Stripe session', () => {
    it('accepts final gateway state as already achieved, marks tx failed atomically with audit', async () => {
      const tx = createMockTransaction({ bookingId: 102, status: 'initiated' })
      transactions.set(tx.transactionId, tx)
      txByBookingId.set(102, tx)

      mockStripeSessionsExpire.mockRejectedValueOnce({
        message: "Only Checkout Sessions with a status in ['open'] can be expired. This Checkout Session has a status of expired.",
        type: 'StripeInvalidRequestError',
        statusCode: 400,
      })

      const res = await paymentService.expireSessionForBooking(102)

      expect(res.attempted).toBe(true)
      expect(res.outcome).toBe('already_expired')

      // Verified atomic call with audit record and expectedVersion (OCC)
      expect(mockPaymentRepo.updateStatus).toHaveBeenCalledWith(
        tx.transactionId,
        'failed',
        undefined,
        expect.objectContaining({
          action: 'EXPIRE_GATEWAY_SESSION',
          newState: 'failed',
          reason: expect.stringContaining('already_expired'),
        }),
        1,
      )

      expect(auditLogs).toHaveLength(1)
      expect(tx.status).toBe('failed')
    })
  })

  describe('Scenario C: Expired booking where Stripe reports COMPLETE', () => {
    it('detects concurrent payment: does NOT mark failed, does NOT refund, does NOT confirm', async () => {
      const tx = createMockTransaction({ bookingId: 103, status: 'initiated' })
      transactions.set(tx.transactionId, tx)
      txByBookingId.set(103, tx)

      mockStripeSessionsExpire.mockRejectedValueOnce({
        message: "Only Checkout Sessions with a status in ['open'] can be expired. This Checkout Session has a status of complete.",
        type: 'StripeInvalidRequestError',
        statusCode: 400,
      })

      const res = await paymentService.expireSessionForBooking(103)

      expect(res.attempted).toBe(true)
      expect(res.outcome).toBe('concurrent_payment_complete')

      // MUST NOT update status to failed!
      expect(mockPaymentRepo.updateStatus).not.toHaveBeenCalledWith(tx.transactionId, 'failed', expect.anything(), expect.anything())

      // MUST record CONCURRENT_PAYMENT observability in audit
      expect(auditLogs).toHaveLength(1)
      expect(auditLogs[0].record.action).toBe('EXPIRE_GATEWAY_SESSION')
      expect(auditLogs[0].record.reason).toContain('concurrent_payment_complete')
      expect(tx.status).toBe('initiated') // Left untouched for Phase 2 Webhook/Recon
    })
  })

  describe('Scenario D: Stripe network/API failure', () => {
    it('records network failure in audit, does NOT throw, does NOT mark transaction failed', async () => {
      const tx = createMockTransaction({ bookingId: 104, status: 'initiated' })
      transactions.set(tx.transactionId, tx)
      txByBookingId.set(104, tx)

      mockStripeSessionsExpire.mockRejectedValueOnce(new Error('ETIMEDOUT to api.stripe.com'))

      const res = await paymentService.expireSessionForBooking(104)

      expect(res.attempted).toBe(true)
      expect(res.outcome).toBe('network_error')
      expect(mockPaymentRepo.updateStatus).not.toHaveBeenCalledWith(tx.transactionId, 'failed', expect.anything(), expect.anything())

      expect(auditLogs).toHaveLength(1)
      expect(auditLogs[0].record.reason).toContain('network_error')
      expect(auditLogs[0].record.reason).toContain('ETIMEDOUT')
    })
  })

  describe('Scenario E: Booking without PaymentTransaction', () => {
    it('returns attempted: false and makes no Stripe call', async () => {
      const res = await paymentService.expireSessionForBooking(999)

      expect(res.attempted).toBe(false)
      expect(mockStripeSessionsExpire).not.toHaveBeenCalled()
      expect(auditLogs).toHaveLength(0)
    })
  })

  describe('Scenario F: Non-Stripe provider (BNPL / Manual)', () => {
    it('returns attempted: false and does not call Stripe when provider is BNPL', async () => {
      const tx = createMockTransaction({
        bookingId: 106,
        provider: 'bnpl',
        status: 'initiated',
        session: { sessionId: 'bnpl_sess_1', url: 'https://bnpl.example.com' },
      })
      transactions.set(tx.transactionId, tx)
      txByBookingId.set(106, tx)

      const res = await paymentService.expireSessionForBooking(106)

      expect(res.attempted).toBe(false)
      expect(mockStripeSessionsExpire).not.toHaveBeenCalled()
      expect(auditLogs).toHaveLength(0)
    })

    it('BNPLPaymentAdapter returns expired_successfully for session expiration', async () => {
      const bnplAdapter = new BNPLPaymentAdapter()
      const res = await bnplAdapter.expireSession('bnpl_sess_test')
      expect(res).toEqual({
        success: true,
        outcome: 'expired_successfully',
        sessionId: 'bnpl_sess_test',
      })
    })
  })

  describe('Scenario G: Duplicate expiration execution / Idempotency', () => {
    it('handles already-failed or already-successful transactions idempotently without duplicate Stripe calls', async () => {
      const tx = createMockTransaction({ bookingId: 107, status: 'failed' })
      transactions.set(tx.transactionId, tx)
      txByBookingId.set(107, tx)

      const res1 = await paymentService.expireSessionForBooking(107)

      expect(res1.attempted).toBe(false)
      expect(res1.outcome).toBe('already_expired')
      expect(mockStripeSessionsExpire).not.toHaveBeenCalled()

      // When transaction was already successful
      tx.status = 'successful'
      const res2 = await paymentService.expireSessionForBooking(107)
      expect(res2.attempted).toBe(false)
      expect(res2.outcome).toBe('concurrent_payment_complete')
      expect(mockStripeSessionsExpire).not.toHaveBeenCalled()
    })
  })

  describe('Integrated Decoupled Expiration Pipeline in BookingExpiration', () => {
    let mockBookingRepo: any
    let mockExperienceService: any
    let bookingExpiration: BookingExpiration
    let committedTransactions: string[]
    let rolledBackTransactions: string[]

    const createMockBooking = (id: number, status: BookingStatus = BookingStatus.PENDING_PAYMENT): BookingAggregate => ({
      id,
      bookingNumber: `LBV-EXP-${id}`,
      version: 1,
      source: 'website',
      status,
      customerId: 501,
      experienceId: 1,
      travelers: [],
      startDate: '2026-10-15',
      endDate: '2026-10-20',
      completionAt: '2026-10-20',
      paymentWindowExpiresAt: new Date(Date.now() - 1000).toISOString(),
      pricingSnapshot: {
        totalPrice: 5000,
        currency: 'EGP',
        basePrice: 5000,
        breakdown: {} as any,
      } as any,
      capacityHold: {
        holdId: `hld_${id}`,
        bookingId: id,
        customerId: 501,
        experienceId: 1,
        date: '2026-10-15',
        seats: 2,
        status: 'active',
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() - 1000).toISOString(),
      },
      pointHold: null,
      pointsEarned: 0,
      paymentAttempts: [],
      timeline: [],
      auditTrail: [],
      documents: {},
      metadata: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })

    beforeEach(() => {
      committedTransactions = []
      rolledBackTransactions = []

      mockBookingRepo = {
        beginTransaction: vi.fn(async () => `tx_${Date.now()}`),
        commitTransaction: vi.fn(async (tId: string) => {
          committedTransactions.push(tId)
        }),
        rollbackTransaction: vi.fn(async (tId: string) => {
          rolledBackTransactions.push(tId)
        }),
        findById: vi.fn(async (id: number) => createMockBooking(id)),
        findExpiredDrafts: vi.fn(async () => [createMockBooking(201)]),
        updateStatusConditionally: vi.fn(async (id: number, _statuses: any[], data: any) => ({
          ...createMockBooking(id),
          ...data,
        })),
      }

      mockExperienceService = {
        getDepartureSlotByDate: vi.fn(async () => ({ departureId: 10 })),
        releaseCapacity: vi.fn(async () => true),
      }

      // Pure Constructor Injection of paymentService via IBookingPaymentGatewayCleanup
      bookingExpiration = new BookingExpiration(
        mockBookingRepo,
        mockExperienceService,
        paymentService,
      )
    })

    it('Proof: Booking expiration and hold release are committed BEFORE Stripe session cleanup', async () => {
      const tx = createMockTransaction({ bookingId: 201, status: 'initiated' })
      transactions.set(tx.transactionId, tx)
      txByBookingId.set(201, tx)

      let committedBeforeStripeCall = false
      mockStripeSessionsExpire.mockImplementationOnce(async () => {
        // Assert that PostgreSQL transaction was already committed when this is called
        committedBeforeStripeCall = committedTransactions.length === 1
        return { id: tx.session!.sessionId, status: 'expired' }
      })

      const count = await bookingExpiration.processExpiredBookings()

      expect(count).toBe(1)
      expect(committedBeforeStripeCall).toBe(true)
      expect(committedTransactions).toHaveLength(1)
      expect(rolledBackTransactions).toHaveLength(0)
      expect(mockExperienceService.releaseCapacity).toHaveBeenCalledWith(10, 2, expect.anything())
    })

    it('Proof: External Stripe failure CANNOT rollback the committed booking expiration or hold release', async () => {
      const booking = createMockBooking(202)
      mockBookingRepo.findExpiredDrafts.mockResolvedValueOnce([booking])

      const tx = createMockTransaction({ bookingId: 202, status: 'initiated' })
      transactions.set(tx.transactionId, tx)
      txByBookingId.set(202, tx)

      // Stripe explodes with 500 Network Exception
      mockStripeSessionsExpire.mockRejectedValueOnce(new Error('Fatal Stripe 500 Outage'))

      const count = await bookingExpiration.processExpiredBookings()

      // Booking is STILL successfully expired and seats are still released!
      expect(count).toBe(1)
      expect(committedTransactions).toHaveLength(1)
      expect(rolledBackTransactions).toHaveLength(0)
      expect(mockExperienceService.releaseCapacity).toHaveBeenCalledWith(10, 2, expect.anything())
    })
  })

  describe('PaymentRepository Optimistic Concurrency Control (OCC) & Lost Update Prevention', () => {
    it('executes atomic updateStatus with conditional where clause matching expected version', async () => {
      const mockPayload = {
        find: vi.fn().mockResolvedValue({
          docs: [
            {
              id: 99,
              transactionId: 'tx_occ_1',
              bookingId: 888,
              customerId: 999,
              version: 5,
              status: 'initiated',
              auditTrail: [],
            },
          ],
        }),
        update: vi.fn().mockImplementation(async ({ where, data }) => {
          return {
            docs: [
              {
                id: 99,
                transactionId: 'tx_occ_1',
                bookingId: 888,
                customerId: 999,
                version: data.version,
                status: data.status,
                auditTrail: data.auditTrail,
              },
            ],
          }
        }),
      }

      const repo = new PaymentRepository(mockPayload as any)
      const auditRec = {
        auditId: 'aud_occ_1',
        actor: { id: 'sys', type: 'system' as const },
        provider: 'stripe' as const,
        action: 'EXPIRE_GATEWAY_SESSION',
        transactionId: 'tx_occ_1',
        bookingId: 888,
        timestamp: new Date().toISOString(),
      }

      const updated = await repo.updateStatus('tx_occ_1', 'failed', undefined, auditRec, 5)

      // Verifies exact WHERE condition containing expected version
      expect(mockPayload.update).toHaveBeenCalledWith(
        expect.objectContaining({
          collection: 'payment-transactions',
          where: {
            and: [
              { transactionId: { equals: 'tx_occ_1' } },
              { version: { equals: 5 } },
            ],
          },
          data: {
            status: 'failed',
            version: 6,
            auditTrail: [auditRec],
          },
        }),
      )
      expect(updated.version).toBe(6)
      expect(updated.status).toBe('failed')
      expect(updated.auditTrail).toHaveLength(1)
    })

    it('throws Optimistic Lock Conflict error when concurrent write changes version (zero docs updated)', async () => {
      const mockPayload = {
        find: vi.fn().mockResolvedValue({
          docs: [
            {
              id: 99,
              transactionId: 'tx_occ_conflict',
              bookingId: 888,
              customerId: 999,
              version: 5,
              status: 'initiated',
              auditTrail: [],
            },
          ],
        }),
        update: vi.fn().mockResolvedValue({ docs: [] }), // 0 rows matched because DB version is now 6!
      }

      const repo = new PaymentRepository(mockPayload as any)

      await expect(
        repo.updateStatus('tx_occ_conflict', 'failed', undefined, undefined, 5),
      ).rejects.toThrow(
        '[PaymentRepository] Optimistic lock conflict: Transaction tx_occ_conflict version mismatch (expected version 5). Concurrency conflict prevented lost update.',
      )
    })

    it('proves Lost Update Prevention: Writer B cannot overwrite Writer A when both read version N', async () => {
      // Shared database state
      let dbDoc: any = {
        id: 99,
        transactionId: 'tx_race',
        bookingId: 888,
        customerId: 999,
        version: 1,
        status: 'initiated',
        auditTrail: [{ action: 'INITIAL_AUDIT' }],
      }

      const mockPayload = {
        find: vi.fn().mockImplementation(async () => ({ docs: [{ ...dbDoc }] })),
        update: vi.fn().mockImplementation(async ({ where, data }) => {
          // Emulate real SQL WHERE transactionId = $1 AND version = $2
          const targetTxId = where.and[0].transactionId.equals
          const targetVersion = where.and[1].version.equals

          if (dbDoc.transactionId === targetTxId && dbDoc.version === targetVersion) {
            dbDoc = {
              ...dbDoc,
              ...data,
            }
            return { docs: [{ ...dbDoc }] }
          }
          // Zero rows matched due to version mismatch!
          return { docs: [] }
        }),
      }

      const repo = new PaymentRepository(mockPayload as any)

      // Writer A reads version 1
      const writerA_tx = await repo.findByTransactionId('tx_race')
      expect(writerA_tx?.version).toBe(1)

      // Writer B reads version 1 concurrently
      const writerB_tx = await repo.findByTransactionId('tx_race')
      expect(writerB_tx?.version).toBe(1)

      // Writer A updates to 'failed' with audit record A
      const auditA = {
        auditId: 'aud_A',
        actor: { id: 'expiration', type: 'system' as const },
        provider: 'stripe' as const,
        action: 'EXPIRE_SESSION',
        transactionId: 'tx_race',
        bookingId: 888,
        timestamp: new Date().toISOString(),
      }
      const writerA_res = await repo.updateStatus('tx_race', 'failed', undefined, auditA, writerA_tx!.version)
      expect(writerA_res.status).toBe('failed')
      expect(writerA_res.version).toBe(2)
      expect(dbDoc.version).toBe(2)

      // Writer B attempts concurrent update to 'successful' with audit record B based on stale version 1
      const auditB = {
        auditId: 'aud_B',
        actor: { id: 'webhook', type: 'system' as const },
        provider: 'stripe' as const,
        action: 'PAYMENT_RECEIVED',
        transactionId: 'tx_race',
        bookingId: 888,
        timestamp: new Date().toISOString(),
      }

      await expect(
        repo.updateStatus('tx_race', 'successful', undefined, auditB, writerB_tx!.version),
      ).rejects.toThrow(/Optimistic lock conflict/)

      // Verify Writer A's state and audit trail were NOT lost or overwritten!
      expect(dbDoc.status).toBe('failed')
      expect(dbDoc.version).toBe(2)
      expect(dbDoc.auditTrail).toHaveLength(2)
      expect(dbDoc.auditTrail[1].auditId).toBe('aud_A')
    })

    it('appendAudit enforces Optimistic Concurrency Control and prevents losing audit records', async () => {
      const mockPayload = {
        find: vi.fn().mockResolvedValue({
          docs: [
            {
              id: 99,
              transactionId: 'tx_audit_occ',
              bookingId: 888,
              customerId: 999,
              version: 3,
              status: 'initiated',
              auditTrail: [],
            },
          ],
        }),
        update: vi.fn().mockResolvedValue({ docs: [] }), // Version changed concurrently
      }

      const repo = new PaymentRepository(mockPayload as any)
      const auditRecord = {
        auditId: 'aud_conflict',
        actor: { id: 'system', type: 'system' as const },
        provider: 'stripe' as const,
        action: 'OBSERVABILITY_AUDIT',
        transactionId: 'tx_audit_occ',
        bookingId: 888,
        timestamp: new Date().toISOString(),
      }

      await expect(
        repo.appendAudit('tx_audit_occ', auditRecord, undefined, 3),
      ).rejects.toThrow(
        '[PaymentRepository] Optimistic lock conflict: Transaction tx_audit_occ version mismatch (expected version 3) while appending audit record.',
      )
    })
  })
})
