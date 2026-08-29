import type { CollectionBeforeChangeHook } from 'payload'
import { getDomainServices } from '@/domains'
import type { RequestContext } from '@/types'

/**
 * Hook: Server-enforced financial invariant & authoritative balance derivation.
 * Ensures the Admin UI / external client cannot manufacture or forge an arbitrary ledger balance.
 */
export const beforePointLedgerChange: CollectionBeforeChangeHook = async ({
  data,
  req,
  operation,
  originalDoc,
}) => {
  if (operation === 'update') {
    throw new Error('[PointLedger IMMUTABILITY VIOLATION] Existing point ledger entries are immutable and cannot be updated.')
  }

  if (operation === 'create') {
    // If the creation was initiated by the domain, the balance is already authoritatively computed.
    if (req?.context?.eventSource === 'domain') {
      return data
    }

    // External creation (e.g. Payload Admin UI). Server must derive authoritative balance.
    const userId = typeof data.user === 'object' && data.user !== null ? Number(data.user.id) : Number(data.user)
    if (!userId || isNaN(userId)) {
      throw new Error('[PointLedger] Customer user ID is required for ledger creation.')
    }

    const services = await getDomainServices()
    const transactionId = req?.transactionID ? await req.transactionID : undefined
    const context: RequestContext | undefined = transactionId ? { transactionId } : undefined

    const currentBalance = await services.loyalty.getCustomerBalance(userId, context)
    const amount = Number(data.amount) || 0

    // Enforce server-side authoritative running balance derivation
    data.balance = currentBalance + amount
    data.ledgerVersion = 1

    if (!data.referenceType) {
      data.referenceType = 'admin_ticket'
    }
    if (!data.referenceId) {
      data.referenceId = `TICK-${Date.now()}`
    }

    console.log(
      `[beforePointLedgerChange Hook] Server derived authoritative balance for customer #${userId}: Previous(${currentBalance}) + Amount(${amount}) = New Balance(${data.balance})`,
    )
  }

  return data
}
