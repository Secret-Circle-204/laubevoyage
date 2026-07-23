import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Enterprise Next.js Request Proxy Pipeline (Next.js 16 Standard)
 * Resolves locale and currency preference priorities (Cookie -> Accept-Language Header -> Fallback)
 * Attaches resolved locale and currency context headers to incoming requests before Page Loader invocation.
 */
export function proxy(request: NextRequest) {
  const response = NextResponse.next()

  // 1. Resolve Locale Priority: Cookie ('laube-locale') -> Accept-Language Header -> Default ('en')
  const cookieLocale = request.cookies.get('laube-locale')?.value
  const acceptLanguage = request.headers.get('accept-language')?.split(',')[0]?.split('-')[0]
  const resolvedLocale = cookieLocale || acceptLanguage || 'en'

  // 2. Resolve Currency Priority: Cookie ('laube-currency') -> Default ('EGP')
  const cookieCurrency = request.cookies.get('laube-currency')?.value
  const resolvedCurrency = cookieCurrency || 'EGP'

  // 3. Attach Resolved Context Headers
  response.headers.set('x-laube-locale', resolvedLocale)
  response.headers.set('x-laube-currency', resolvedCurrency)

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|images).*)',
  ],
}
