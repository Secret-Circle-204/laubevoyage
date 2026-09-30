import React from 'react'
import { Header, Footer } from '@/components/layout'
import { CustomerPortalLoader } from '@/application/dashboard/loaders'
import { CustomerSidebar } from '@/components/features/dashboard/CustomerSidebar'
import { LayoutLoader } from '@/application/layout/layout-loader'

import { SessionResolver } from '@/application/auth/session-resolver'
import { redirect } from 'next/navigation'

import { getLocaleContext } from '@/lib/get-locale-context'

export default async function CustomerLayout({ children }: { children: React.ReactNode }) {
  const session = await SessionResolver.resolve()
  if (!session.isAuthenticated || session.role !== 'customer' || !session.customerId) {
    redirect('/login')
  }

  const localeCtx = await getLocaleContext()
  const layoutData = await LayoutLoader.load({
    locale: localeCtx.language,
    currency: localeCtx.currency,
    customerId: session.customerId,
  })
  const sidebarData = await CustomerPortalLoader.loadSidebar(session.customerId, localeCtx.language)

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground print:bg-white print:text-black print:min-h-0 print:p-0">
      <div className="print:hidden">
        <Header data={layoutData} />
      </div>
      <main className="flex-grow pt-24 sm:pt-28 pb-12 print:py-0 print:m-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col lg:flex-row gap-8 print:max-w-none print:p-0 print:m-0 print:block">
          <div className="print:hidden">
            <CustomerSidebar data={sidebarData} unreadCount={layoutData.unreadNotificationsCount} />
          </div>
          <div className="flex-1 w-full print:w-full print:max-w-none">{children}</div>
        </div>
      </main>
      <div className="print:hidden">
        <Footer data={layoutData} />
      </div>
    </div>
  )
}
