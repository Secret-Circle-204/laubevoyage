import { getDomainServices } from '@/domains/factory'
import { CANONICAL_CUSTOMER_NAV_ITEMS } from '@/application/dashboard/navigation'
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
        if (customerDoc.email) {
          const notifs = await notification.getNotificationsByRecipient(customerDoc.email, 1, 20)
          unreadNotificationsCount = notifs.data.filter((log) => log.status === 'queued' || log.status === 'processing').length
        }
      } catch (err) {
        console.error('[LayoutLoader] Failed loading customer session data:', err)
        throw err
      }
    }

    const customerNavLabels: Record<string, string> = {}
    for (const item of CANONICAL_CUSTOMER_NAV_ITEMS) {
      customerNavLabels[item.id] = localization.translateUiKey(item.translationKey, ctx)
    }

    const uiLabels = {
      myAccount: localization.translateUiKey('layout.header.myAccount', ctx),
      signOut: localization.translateUiKey('layout.header.signOut', ctx),
      logIn: localization.translateUiKey('layout.header.logIn', ctx),
      signIn: localization.translateUiKey('layout.header.signIn', ctx),
      register: localization.translateUiKey('layout.header.register', ctx),
      bookNow: localization.translateUiKey('layout.header.bookNow', ctx),
      adminPortal: localization.translateUiKey('layout.header.adminPortal', ctx),
      travelCommand: localization.translateUiKey('layout.header.travelCommand', ctx),
      searchPlaceholder: localization.translateUiKey('layout.header.searchPlaceholder', ctx),
      searchButton: localization.translateUiKey('layout.header.searchButton', ctx),
      clearSearch: localization.translateUiKey('layout.header.clearSearch', ctx),
      searchAriaLabel: localization.translateUiKey('layout.header.searchAriaLabel', ctx),
      exploreCollection: localization.translateUiKey('layout.header.exploreCollection', ctx),
      languagePreferences: localization.translateUiKey('layout.header.languagePreferences', ctx),
      currencyDisplay: localization.translateUiKey('layout.header.currencyDisplay', ctx),
      selectLanguage: localization.translateUiKey('layout.header.selectLanguage', ctx),
      selectCurrency: localization.translateUiKey('layout.header.selectCurrency', ctx),
      openMenu: localization.translateUiKey('layout.header.openMenu', ctx),
      closeMenu: localization.translateUiKey('layout.header.closeMenu', ctx),
      brandDescription: localization.translateUiKey('layout.footer.brandDescription', ctx),
      rights: localization.translateUiKey('layout.footer.rights', ctx),
      privacyPolicy: localization.translateUiKey('layout.footer.privacyPolicy', ctx),
      termsOfService: localization.translateUiKey('layout.footer.termsOfService', ctx),
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
      customerNavLabels,
      uiLabels,
    }
  }
}
