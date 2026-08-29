import type { CollectionAfterChangeHook } from 'payload'
import { getDomainServices } from '@/domains'
import type { RequestContext } from '@/types'

/**
 * Hook: Dumb bridge that forwards external Admin-created point ledger entries to the Loyalty Domain.
 * Avoids duplicate events when the ledger entry is written by the Domain Service itself.
 */
export const afterPointLedgerCreate: CollectionAfterChangeHook = async ({ doc, req, operation }) => {
  if (operation === 'create') {
    // If the creation was initiated by the domain, it published its own domain event and updated customer snapshot.
    if (req?.context?.eventSource === 'domain') {
      return doc
    }

    // Otherwise, this is an external creation from Payload Admin / CLI / Seed.
    // Delegate to domain service inside the same transaction boundary.
    const services = await getDomainServices()
    const transactionId = req?.transactionID ? await req.transactionID : undefined
    const context: RequestContext | undefined = transactionId ? { transactionId } : undefined

    const customerId =
      typeof doc.user === 'object' && doc.user !== null ? Number(doc.user.id) : Number(doc.user)
    const resultingBalance = Number(doc.balance)
    const points = Number(doc.amount)
    const ledgerId = String(doc.id)

    console.log(
      `[afterPointLedgerCreate Hook] Traced external ledger entry #${ledgerId} for customer #${customerId} (Amount: ${points}, Resulting Balance: ${resultingBalance}). Context tx:`,
      !!transactionId,
    )

    try {
      await services.loyalty.onAdminLedgerEntryCreated(
        {
          customerId,
          points,
          balance: resultingBalance,
          ledgerId,
          type: doc.type,
          reason: doc.reason,
          ticket: doc.referenceId || `TICK-${Date.now()}`,
          adminId: req?.user?.id ? String(req.user.id) : 'staff_admin',
        },
        context,
      )
      console.log(
        `[afterPointLedgerCreate Hook] Successfully synchronized customer #${customerId} and emitted MANUAL_ADJUSTMENT for ledger entry #${ledgerId}`,
      )
    } catch (err) {
      console.error(
        `[afterPointLedgerCreate Hook] Fatal error processing onAdminLedgerEntryCreated for ledger #${ledgerId}:`,
        err,
      )
      throw err
    }
  }

  return doc
}
