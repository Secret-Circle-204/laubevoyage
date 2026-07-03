import type { Metadata } from 'next'
import { Inter, Playfair_Display } from 'next/font/google'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import Image from 'next/image'
import '../(website)/globals.css'
import Link from 'next/link'

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
})

const playfair = Playfair_Display({
  variable: '--font-playfair',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'My Laube Voyage | Authentication',
  description: 'Secure access to your bespoke travel experiences.',
}

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="scroll-smooth dark" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${playfair.variable} antialiased h-screen overflow-hidden`}
      >
        <ThemeProvider>
          <main className="relative h-screen w-full flex items-center justify-center">
            {/* Cinematic Background */}
            <div className="absolute inset-0 z-0">
              <Image
                src="/images/auth-bg.png"
                alt="Luxury Travel Experience"
                fill
                className="object-cover brightness-[0.6] saturate-[0.8]"
                priority
              />
              <div className="absolute inset-0 bg-linear-to-tr from-black/80 via-black/40 to-transparent" />
            </div>

            {/* Content Container */}
            <div className="relative z-10 w-full max-w-md px-6">
              <div className="text-center mb-8">
                <h1 className="text-4xl font-serif font-bold text-white tracking-tighter uppercase italic drop-shadow-2xl">
                  My Laube Voyage
                </h1>
                <p className="text-stone-300/80 text-sm mt-2 font-medium tracking-widest uppercase">
                  Passport to Excellence
                </p>
              </div>

              <div className="bg-black/20 backdrop-blur-3xl border border-white/10 rounded-[40px] p-10 shadow-2xl relative overflow-hidden group">
                {/* Decorative highlight */}
                <div className="absolute -top-24 -left-24 w-48 h-48 bg-primary/10 rounded-full blur-3xl" />

                {children}
              </div>

              {/* Back to Site */}
              <div className="mt-8 text-center">
                <Link
                  href="/"
                  className="text-stone-400 hover:text-white text-xs font-bold uppercase tracking-[0.3em] transition-colors duration-300"
                >
                  Return to Main Sanctuary
                </Link>
              </div>
            </div>

            {/* Subtle floating elements */}
            <div className="absolute bottom-10 right-10 flex items-center gap-4 opacity-50">
              <p className="text-[10px] text-white font-serif italic tracking-widest uppercase">
                Est. 1996
              </p>
              <div className="h-4 w-px bg-white/20" />
              <p className="text-[10px] text-white font-serif italic tracking-widest uppercase">
                Global Bespoke Travel
              </p>
            </div>
          </main>
        </ThemeProvider>
      </body>
    </html>
  )
}
