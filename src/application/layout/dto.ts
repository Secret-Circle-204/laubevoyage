export interface NavigationItemDTO {
  label: string
  href: string
  isExternal?: boolean
  children?: NavigationItemDTO[]
}

export interface CurrencyOptionDTO {
  code: string
  name: string
  symbol: string
}

export interface LocaleOptionDTO {
  code: string
  name: string
}

export interface LayoutDTO {
  navigationMenu: NavigationItemDTO[]
  activeLocale: string
  activeCurrency: string
  supportedCurrencies: CurrencyOptionDTO[]
  supportedLocales: LocaleOptionDTO[]
  userSession?: {
    isAuthenticated: boolean
    customerId?: number
    fullName?: string
    email?: string
    points?: number
    tier?: string
  }
  unreadNotificationsCount: number
}
