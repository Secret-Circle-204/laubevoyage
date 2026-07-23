export interface NavigationItemDTO {
  label: string
  href: string
  isExternal?: boolean
  children?: NavigationItemDTO[]
}

export interface LayoutDTO {
  navigationMenu: NavigationItemDTO[]
  activeLocale: 'ar' | 'en' | 'fr'
  activeCurrency: 'EGP' | 'USD' | 'EUR' | 'GBP' | 'SAR' | 'AED'
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
