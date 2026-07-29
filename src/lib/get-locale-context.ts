import { cache } from 'react'
import { cookies, headers } from 'next/headers'
import { SessionResolver } from '@/application/auth/session-resolver'
import { getDomainServices } from '@/domains/factory'
import type { LocaleContext } from '@/types/locale'

/**
 * Request-Scoped LocaleContext Resolver (Single Source of Truth).
 * Memoizes buildContext calculation using React's request cache for 0ms reuse across the request.
 * Contains ZERO business logic (pure delegation helper).
 */
export const getLocaleContext = cache(async (): Promise<LocaleContext> => {
  const cookieStore = await cookies()
  const headerStore = await headers()
  const session = await SessionResolver.resolve()
  const { localization } = await getDomainServices()

  return localization.buildContext({
    cookieLocale: cookieStore.get('laube-locale')?.value,
    cookieCurrency: cookieStore.get('laube-currency')?.value,
    sessionLanguage: session.preferredLanguage,
    sessionCurrency: session.preferredCurrency,
    acceptLanguage:
      headerStore.get('x-laube-accept-language') || headerStore.get('accept-language') || undefined,
    geoCountry:
      headerStore.get('x-laube-country') ||
      headerStore.get('x-vercel-ip-country') ||
      headerStore.get('cf-ipcountry') ||
      undefined,
  })
})
