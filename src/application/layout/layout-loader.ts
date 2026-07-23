import { getDomainServices } from '@/domains/factory'
import type { LayoutDTO, NavigationItemDTO, CurrencyOptionDTO, LocaleOptionDTO } from './dto'
import { catalogRegistry } from '@/domains/currency/catalog-registry'

export class LayoutLoader {
  static async load(params?: { locale?: string; currency?: string; customerId?: number }): Promise<LayoutDTO> {
    const locale = params?.locale || 'en'
    const currency = params?.currency || 'EGP'

    const { content, customer, translation } = await getDomainServices()
    const navigationMenu: NavigationItemDTO[] = await content.getNavigationMenu(locale)

    let supportedCurrencies: CurrencyOptionDTO[] = []
    try {
      const activeCurrencies = await catalogRegistry.getAll()
      supportedCurrencies = activeCurrencies.map((c) => ({
        code: c.isoCode,
        name: c.name,
        symbol: c.symbol,
      }))
    } catch {
      supportedCurrencies = []
    }

    let supportedLocales: LocaleOptionDTO[] = []
    try {
      supportedLocales = await translation.getSupportedLocales()
    } catch {
      supportedLocales = []
    }

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
          tier: (customerDoc.loyalty?.tier || 'explorer') as string,
        }
      } catch {
        userSession = { isAuthenticated: false }
      }
    }

    return {
      navigationMenu,
      activeLocale: locale,
      activeCurrency: currency,
      supportedCurrencies,
      supportedLocales,
      userSession,
      unreadNotificationsCount: 0,
    }
  }
}
