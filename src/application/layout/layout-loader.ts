import { getDomainServices } from '@/domains/factory'
import type { LayoutDTO, NavigationItemDTO, CurrencyOptionDTO, LocaleOptionDTO } from './dto'

export class LayoutLoader {
  static async load(params?: { locale?: string; currency?: string; customerId?: number }): Promise<LayoutDTO> {
    const { content, customer, language, currency: currencyService, localization } = await getDomainServices()
    const ctx = await localization.buildContext({
      cookieLocale: params?.locale,
      cookieCurrency: params?.currency,
    })
    const locale = ctx.language
    const currency = ctx.currency
    const navigationMenu: NavigationItemDTO[] = await content.getNavigationMenu(locale)
    const footerNavigation = await content.getFooterNavigation(locale)

    let supportedCurrencies: CurrencyOptionDTO[] = []
    try {
      const activeCurrencies = await currencyService.getActiveCurrencies()
      supportedCurrencies = activeCurrencies.map((c) => ({
        code: c.isoCode,
        name: c.name,
        symbol: c.symbol,
        flagCode: c.flagCode || undefined,
      }))
    } catch (err) {
      console.error('[LayoutLoader] Failed fetching supported currencies from database:', err)
      throw err
    }

    let supportedLocales: LocaleOptionDTO[] = []
    try {
      const activeLanguages = await language.getActiveLanguages()
      supportedLocales = activeLanguages.map((l) => ({
        code: l.code,
        name: l.nativeName,
      }))
    } catch (err) {
      console.error('[LayoutLoader] Failed fetching supported languages from database:', err)
      throw err
    }

    let userSession: LayoutDTO['userSession'] = undefined
    let unreadNotificationsCount = 0
    if (params?.customerId) {
      try {
        const customerDoc = await customer.getById(params.customerId)
        userSession = {
          isAuthenticated: true,
          customerId: customerDoc.customerId,
          fullName: customerDoc.fullName || customerDoc.email,
          email: customerDoc.email,
          points: customerDoc.loyalty?.points || 0,
          tier: (customerDoc.loyalty?.tier || '') as string,
        }

        const { notification } = await getDomainServices()
        const repo = (notification as any).workflowEngine?.repository
        if (repo && typeof repo.findByRecipient === 'function' && customerDoc.email) {
          const logs = await repo.findByRecipient(customerDoc.email, 20)
          unreadNotificationsCount = logs.filter((log: any) => log.status === 'queued' || log.status === 'processing').length
        }
      } catch (err) {
        console.error('[LayoutLoader] Failed loading customer session data:', err)
        throw err
      }
    }

    const uiLabels = {
      myAccount: localization.translateUiKey('layout.header.myAccount', ctx),
      signOut: localization.translateUiKey('layout.header.signOut', ctx),
      logIn: localization.translateUiKey('layout.header.logIn', ctx),
      bookNow: localization.translateUiKey('layout.header.bookNow', ctx),
      brandDescription: localization.translateUiKey('layout.footer.brandDescription', ctx),
    }

    return {
      navigationMenu,
      footerNavigation,
      activeLocale: locale,
      activeCurrency: currency,
      supportedCurrencies,
      supportedLocales,
      userSession,
      unreadNotificationsCount,
      uiLabels,
    }
  }
}
