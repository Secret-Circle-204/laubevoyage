import { getDomainServices } from '@/domains/factory'
import type { LayoutDTO, NavigationItemDTO } from './dto'

export class LayoutLoader {
  static async load(params?: { locale?: 'ar' | 'en' | 'fr'; currency?: string; customerId?: number }): Promise<LayoutDTO> {
    const locale = params?.locale || 'en'
    const currency = (params?.currency || 'EGP') as LayoutDTO['activeCurrency']

    const { content, customer } = await getDomainServices()
    const navigationMenu: NavigationItemDTO[] = await content.getNavigationMenu(locale)

    let userSession: LayoutDTO['userSession'] = undefined
    if (params?.customerId) {
      try {
        const customerDoc = await customer.getById(params.customerId)
        userSession = {
          isAuthenticated: true,
          customerId: customerDoc.customerId,
          fullName: customerDoc.fullName || customerDoc.email,
          email: customerDoc.email,
          points: customerDoc.loyalty?.points || 0,
          tier: (customerDoc.loyalty?.tier || 'explorer') as any,
        }
      } catch {
        userSession = { isAuthenticated: false }
      }
    }

    return {
      navigationMenu,
      activeLocale: locale,
      activeCurrency: currency,
      userSession,
      unreadNotificationsCount: 0,
    }
  }
}
