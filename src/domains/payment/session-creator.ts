import type { PaymentAggregate } from './aggregate'
import type { CreateSessionParams, PaymentProviderType } from './types'
import { PaymentRepository } from './repository'
import { PaymentPolicy } from './policy'
import { PaymentAdapterFactory } from './adapters/factory'

/**
 * Session Creator Sub-Service
 * Handles payment session initialization, adapter execution, and transaction record creation.
 */
export class SessionCreator {
  private repository: PaymentRepository

  constructor(repository: PaymentRepository) {
    this.repository = repository
  }

  async createSession(
    provider: PaymentProviderType,
    params: CreateSessionParams,
    bookingStatus: string,
  ): Promise<PaymentAggregate> {
    // 1. Validate policy
    const policyResult = PaymentPolicy.canCreateSession(bookingStatus, params.displayAmount)
    if (!policyResult.allowed) {
      throw new Error(`[PaymentPolicy] Session creation forbidden: ${policyResult.reason}`)
    }

    // 2. Resolve adapter & create gateway checkout session
    const adapter = PaymentAdapterFactory.resolve(provider)
    const sessionResult = await adapter.createCheckoutSession(params)

    // 3. Build audit record
    const auditRecord = {
      auditId: `aud_${Date.now()}`,
      actor: { id: params.customerId, type: 'customer' as const },
      provider,
      action: 'CREATE_PAYMENT_SESSION',
      previousState: undefined,
      newState: 'initiated' as const,
      transactionId: params.transactionId,
      bookingId: params.bookingId,
      timestamp: new Date().toISOString(),
    }

    // 4. Create payment transaction aggregate in repository
    const transactionData = {
      transactionId: params.transactionId,
      bookingId: params.bookingId,
      customerId: params.customerId,
      version: 1,
      provider,
      status: 'initiated',
      session: sessionResult,
      attempts: [
        {
          attemptId: `att_${Date.now()}`,
          attemptNumber: 1,
          provider,
          amount: params.displayAmount,
          currency: params.displayCurrency,
          status: 'initiated',
          transactionReference: sessionResult.sessionId,
          timestamp: new Date().toISOString(),
        },
      ],
      webhookLedger: [],
      auditTrail: [auditRecord],
      gatewayReference: sessionResult.sessionId,
    }

    return this.repository.createTransaction(transactionData)
  }
}
