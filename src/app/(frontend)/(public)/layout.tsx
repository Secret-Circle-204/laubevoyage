import React from 'react'
import { cookies } from 'next/headers'
import { Header, Footer } from '@/components/layout'
import { LayoutLoader } from '@/application/layout/layout-loader'

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const locale = cookieStore.get('laube-locale')?.value
  const currency = cookieStore.get('laube-currency')?.value

  const layoutData = await LayoutLoader.load({ locale, currency })

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Header data={layoutData} />
      <main className="flex-grow">{children}</main>
      <Footer data={layoutData} />
    </div>
  )
}

