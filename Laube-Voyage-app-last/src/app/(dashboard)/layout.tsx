import type { Metadata } from 'next'
import { Inter, Playfair_Display } from 'next/font/google'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import '../(website)/globals.css'
import localFont from 'next/font/local'

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
  title: 'My Laube Voyage | Dashboard',
  description: 'Manage your luxury travel experiences and loyalty rewards.',
}

export default function DashboardRootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="scroll-smooth" suppressHydrationWarning>
      <head>
        {/* Prevent FOUC by setting theme class before hydration */}
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
        className={`${inter.variable} ${playfair.variable} ${hornbill.variable} antialiased bg-stone-50 dark:bg-black`}
      >
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
