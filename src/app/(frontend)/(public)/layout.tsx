import React from 'react'
import { Header, Footer } from '@/components/layout'
import { LayoutLoader } from '@/application/layout/layout-loader'

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const layoutData = await LayoutLoader.load({ locale: 'en', currency: 'EGP' })

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <Header data={layoutData} />
      <main className="flex-grow">{children}</main>
      <Footer />
    </div>
  )
}
