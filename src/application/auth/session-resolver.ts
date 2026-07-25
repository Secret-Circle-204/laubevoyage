import { cookies } from 'next/headers'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getDomainServices } from '@/domains/factory'

export interface ResolvedSession {
  isAuthenticated: boolean
  customerId?: number
  email?: string
  firstName?: string
  lastName?: string
  tier?: string
  points?: number
  preferredCurrency?: string
  preferredLanguage?: string
}

export class SessionResolver {
  static async resolve(): Promise<ResolvedSession> {
    try {
      const cookieStore = await cookies()
      const token = cookieStore.get('payload-token')?.value
      if (!token) {
        return { isAuthenticated: false }
      }

      const payload = await getPayload({ config })
      const { user } = await payload.auth({
        headers: new Headers({
          cookie: `payload-token=${token}`,
        }),
      })

      if (!user || user.collection !== 'customers') {
        return { isAuthenticated: false }
      }

      const customerId = Number(user.id)
      const services = await getDomainServices()
      const profile = await services.customer.getProfile(customerId)
      const balance = await services.loyalty.getCustomerBalance(customerId)

      return {
        isAuthenticated: true,
        customerId,
        email: profile.email,
        firstName: profile.firstName,
        lastName: profile.lastName,
        preferredCurrency: profile.preferredCurrency || 'EGP',
        preferredLanguage: profile.preferredLanguage || 'en',
        points: balance,
      }
    } catch {
      return { isAuthenticated: false }
    }
  }
}
