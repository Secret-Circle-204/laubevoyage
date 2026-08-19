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
  if (!session.isAuthenticated || !session.customerId) {
    redirect('/login')
  }

  const localeCtx = await getLocaleContext()
  const layoutData = await LayoutLoader.load({
    locale: localeCtx.language,
    currency: localeCtx.currency,
  })
  const sidebarData = await CustomerPortalLoader.loadSidebar(session.customerId)

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <Header data={layoutData} />
      <main className="flex-grow py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col lg:flex-row gap-8">
          <CustomerSidebar data={sidebarData} />
          <div className="flex-1 w-full">{children}</div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
