import { cookies, headers } from 'next/headers'
import { getPayload } from 'payload'
import config from '@payload-config'
import { cache } from 'react'
import { getDomainServices } from '@/domains/factory'

export interface ResolvedSession {
  isAuthenticated: boolean
  userId?: number
  customerId?: number
  email?: string
  firstName?: string
  lastName?: string
  tier?: string
  preferredCurrency?: string
  preferredLanguage?: string
  role?: 'admin' | 'super_admin' | 'customer'
}

// Request-scoped memoized correlation ID generator
const getRequestId = cache(() => {
  return Math.random().toString(36).substring(2, 9)
})

export class SessionResolver {
  static resolve = cache(async (): Promise<ResolvedSession> => {
    try {
      const cookieStore = await cookies()
      const token = cookieStore.get('payload-token')?.value
      if (!token) {
        return { isAuthenticated: false }
      }

      const reqId = getRequestId()
      const headerStore = await headers()
      console.log(`[SessionResolver] [Req:${reqId}] DB auth start`)
      const payload = await getPayload({ config })
      const { user } = await payload.auth({
        headers: headerStore,
      })
      console.log(`[SessionResolver] [Req:${reqId}] DB auth end`)

      if (!user) {
        return { isAuthenticated: false }
      }

      if (user.collection === 'users') {
        return {
          isAuthenticated: true,
          role: (user as any).role || 'admin',
          email: user.email,
          firstName: (user as any).firstName,
          lastName: (user as any).lastName,
          userId: Number(user.id),
          customerId: undefined,
        }
      }

      if (user.collection !== 'customers') {
        return { isAuthenticated: false }
      }

      // user is automatically narrowed to Customer type here by TypeScript
      const services = await getDomainServices()
      const profile = services.customer.mapPayloadUser(user)

      console.log(`[SessionResolver] [Req:${reqId}] resolved`)

      return {
        isAuthenticated: true,
        role: 'customer',
        customerId: profile.customerId,
        email: profile.email,
        firstName: profile.firstName,
        lastName: profile.lastName,
        tier: profile.loyalty?.tier,
        preferredCurrency: profile.preferredCurrency,
        preferredLanguage: profile.preferredLanguage,
      }
    } catch (e) {
      console.error('[SessionResolver] Error during session resolution:', e)
      return { isAuthenticated: false }
    }
  })
}
