export interface CustomerNavigationItemConfig {
  readonly id: 'overview' | 'bookings' | 'loyalty' | 'profile' | 'invoices' | 'notifications' | 'settings'
  readonly href: string
  readonly translationKey: string
  readonly icon: 'overview' | 'bookings' | 'loyalty' | 'profile' | 'invoices' | 'notifications' | 'settings'
}

/**
 * Single Source of Truth (SSOT) for customer account navigation routes.
 * Consumed by both CustomerSidebar and CustomerAccountMenu to prevent duplication.
 */
export const CANONICAL_CUSTOMER_NAV_ITEMS: readonly CustomerNavigationItemConfig[] = [
  { id: 'overview', href: '/dashboard', translationKey: 'layout.sidebar.overview', icon: 'overview' },
  { id: 'bookings', href: '/dashboard/bookings', translationKey: 'layout.sidebar.myBookings', icon: 'bookings' },
  { id: 'loyalty', href: '/dashboard/loyalty', translationKey: 'layout.sidebar.loyaltyRewards', icon: 'loyalty' },
  { id: 'profile', href: '/dashboard/profile', translationKey: 'layout.sidebar.profileCompanions', icon: 'profile' },
  { id: 'invoices', href: '/dashboard/invoices', translationKey: 'layout.sidebar.invoicesReceipts', icon: 'invoices' },
  { id: 'notifications', href: '/dashboard/notifications', translationKey: 'layout.sidebar.notifications', icon: 'notifications' },
  { id: 'settings', href: '/dashboard/settings', translationKey: 'layout.sidebar.settings', icon: 'settings' },
] as const
