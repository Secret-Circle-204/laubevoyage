import type { Metadata } from 'next'
import localFont from 'next/font/local'
import { Inter, Playfair_Display } from 'next/font/google'
import { Suspense } from 'react'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import { AuthProvider } from '@/components/providers/AuthProvider'
import { Navigation } from '@/components/premium-ui/Navigation'
import { Footer } from '@/components/premium-ui/Footer'
import WhatsAppWidget from '@/components/shared/WhatsAppWidget'
import './globals.css'

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

export const metadata: Metadata = {
  title: "L'AUBE VOYAGE | Premium Travel Experiences",
  description: 'Crafting Journeys Since 1996: Your Passport to Global and Local Discoveries.',
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="scroll-smooth" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('laube-theme');
                  var supportDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  if (!theme && supportDark) theme = 'dark';
                  if (!theme) theme = 'dark';
                  document.documentElement.classList.add(theme);
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body
        className={`${inter.variable} ${playfair.variable} ${hornbill.variable} antialiased`}
        suppressHydrationWarning
      >
        <ThemeProvider>
          <AuthProvider>
            <Suspense fallback={null}>
              <Navigation />
              {children}
              <Footer />
            </Suspense>
          </AuthProvider>
          <WhatsAppWidget />
        </ThemeProvider>
      </body>
    </html>
  )
}
