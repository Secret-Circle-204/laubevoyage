import React from 'react'
import { cookies } from 'next/headers'
import { Header, Footer } from '@/components/layout'
import { LayoutLoader } from '@/application/layout/layout-loader'

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const locale = cookieStore.get('laube-locale')?.value || 'en'
  const currency = cookieStore.get('laube-currency')?.value || 'EGP'

  const layoutData = await LayoutLoader.load({ locale, currency })

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <Header data={layoutData} />
      <main className="flex-grow">{children}</main>
      <Footer data={layoutData} />
    </div>
  )
}

