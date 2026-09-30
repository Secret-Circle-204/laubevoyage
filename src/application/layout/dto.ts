export interface NavigationItemDTO {
  label: string
  href: string
  isExternal?: boolean
  children?: NavigationItemDTO[]
}

export interface FooterColumnDTO {
  title: string
  links: { label: string; href: string }[]
}

export interface CurrencyOptionDTO {
  code: string
  name: string
  symbol: string
  flagCode?: string
}

export interface LocaleOptionDTO {
  code: string
  name: string
}

export interface HeaderLabelsDTO {
  myAccount: string
  signOut: string
  logIn: string
  signIn: string
  register: string
  bookNow: string
  adminPortal: string
  travelCommand: string
  searchPlaceholder: string
  searchButton: string
  clearSearch: string
  searchAriaLabel: string
  exploreCollection: string
  languagePreferences: string
  currencyDisplay: string
  selectLanguage: string
  selectCurrency: string
  openMenu: string
  closeMenu: string
  brandDescription: string
}

export interface LayoutDTO {
  navigationMenu: NavigationItemDTO[]
  footerNavigation: FooterColumnDTO[]
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
  customerNavLabels?: Record<string, string>
  uiLabels: HeaderLabelsDTO
}

