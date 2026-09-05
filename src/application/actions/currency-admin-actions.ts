'use server'

import { getDomainServices } from '@/domains/factory'
import { getPayload } from 'payload'
import config from '@payload-config'
import { headers } from 'next/headers'

export async function syncExchangeRatesAdminAction(): Promise<{
  success: boolean
  message: string
  code?: string
  itemsProcessed?: number
}> {
  const payload = await getPayload({ config })
  const headersList = await headers()
  const { user } = await payload.auth({ headers: headersList })

  const isAdmin = Boolean(
    user && 'role' in user && (user.role === 'admin' || user.role === 'super_admin'),
  )

  if (!isAdmin || !user) {
    return {
      success: false,
      code: 'UNAUTHORIZED',
      message: 'Unauthorized: Administrator privileges required.',
    }
  }

  try {
    const { maintenance } = await getDomainServices()
    const workerId = `admin_${user.id}`
    const result = await maintenance.triggerJob('currency_rate_refresh', 'manual_admin', workerId)

    if (!result.success) {
      return {
        success: false,
        code: 'JOB_LEASE_LOCKED',
        message: 'Synchronization is currently in progress or locked by another worker.',
        itemsProcessed: 0,
      }
    }

    return {
      success: true,
      message: 'Exchange rates synchronized successfully across all active providers.',
      itemsProcessed: result.itemsProcessed,
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    console.error('[syncExchangeRatesAdminAction] Failed:', errorMsg)
    return {
      success: false,
      code: 'SYNC_FAILED',
      message: `Failed to synchronize exchange rates: ${errorMsg}`,
    }
  }
}
