import { cookies } from 'next/headers'
import { getPayload } from 'payload'
import config from '@payload-config'
import { cache } from 'react'
import { getDomainServices } from '@/domains/factory'

export interface ResolvedSession {
  isAuthenticated: boolean
  customerId?: number
  email?: string
  firstName?: string
  lastName?: string
  tier?: string
  preferredCurrency?: string
  preferredLanguage?: string
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
      console.log(`[SessionResolver] [Req:${reqId}] DB auth start`)
      const payload = await getPayload({ config })
      const { user } = await payload.auth({
        headers: new Headers({
          cookie: `payload-token=${token}`,
        }),
      })
      console.log(`[SessionResolver] [Req:${reqId}] DB auth end`)

      if (!user || user.collection !== 'customers') {
        return { isAuthenticated: false }
      }

      // user is automatically narrowed to Customer type here by TypeScript
      const services = await getDomainServices()
      const profile = services.customer.mapPayloadUser(user)

      console.log(`[SessionResolver] [Req:${reqId}] resolved`)

      return {
        isAuthenticated: true,
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
