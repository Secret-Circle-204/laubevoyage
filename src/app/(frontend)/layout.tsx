import React from 'react'
import localFont from 'next/font/local'
import { Inter, Playfair_Display } from 'next/font/google'
import './styles.css'
import { AppProviders } from '@/providers'

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
})

const playfair = Playfair_Display({
  variable: '--font-playfair',
  subsets: ['latin'],
})

const hornbill = localFont({
  src: [
    {
      path: '../../../public/fonts/HornbillTrial-Regular.ttf',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../../../public/fonts/HornbillTrial-Italic.ttf',
      weight: '400',
      style: 'italic',
    },
    {
      path: '../../../public/fonts/HornbillTrial-Bold.ttf',
      weight: '700',
      style: 'normal',
    },
    {
      path: '../../../public/fonts/HornbillTrial-BoldItalic.ttf',
      weight: '700',
      style: 'italic',
    },
    {
      path: '../../../public/fonts/HornbillTrial-Black.ttf',
      weight: '900',
      style: 'normal',
    },
    {
      path: '../../../public/fonts/HornbillTrial-BlackItalic.ttf',
      weight: '900',
      style: 'italic',
    },
  ],
  variable: '--font-hornbill',
})

export const metadata = {
  title: "L'AUBE VOYAGE | Luxury Travel & Experiences",
  description: 'Crafting Journeys Since 1996: Your Passport to Global and Local Discoveries.',
}

import { getLocaleContext } from '@/lib/get-locale-context'
import { SessionResolver } from '@/application/auth/session-resolver'

export default async function RootLayout(props: { children: React.ReactNode }) {
  const { children } = props

  const ctx = await getLocaleContext()
  console.log(`[RootLayout] resolved context with currency = "${ctx.currency}", requestContextId = "${ctx.requestContextId || ''}"`)

  const session = await SessionResolver.resolve()

  const initialLocale = ctx.language
  const initialCurrency = ctx.currency
  const dir = ctx.direction || (ctx.isRTL ? 'rtl' : 'ltr')

  return (
    <html lang={initialLocale} dir={dir} className="scroll-smooth dark" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('laube-theme');
                  if (!theme) theme = 'dark';
                  if (theme === 'dark') {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body
        className={`${inter.variable} ${playfair.variable} ${hornbill.variable} antialiased bg-[#231F20] text-slate-100 min-h-screen transition-colors duration-300`}
        suppressHydrationWarning
      >
        <AppProviders initialLocale={initialLocale} initialDirection={dir} initialCurrency={initialCurrency} initialSession={session}>
          {children}
        </AppProviders>
      </body>
    </html>
  )
}
