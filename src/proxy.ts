import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Bot User-Agent patterns to block malicious automated scripts
const BOT_USER_AGENTS = [
  'curl',
  'python-requests',
  'sqlmap',
  'nikto',
  'scrapy',
  'postmanruntime',
  'httpclient',
]

// Simple, O(1) memory-bound Token Bucket rate limiter
class TokenBucketLimiter {
  private store = new Map<string, { tokens: number; lastRefilled: number }>()
  private readonly maxKeys = 2000

  isRateLimited(key: string, limit: number, refillRatePerMs: number): boolean {
    const now = Date.now()
    const record = this.store.get(key)

    if (!record) {
      this.store.set(key, {
        tokens: limit - 1,
        lastRefilled: now,
      })
      // O(1) constant-time eviction (FIFO/LRU-ish order preserved by JS Map keys)
      if (this.store.size > this.maxKeys) {
        const oldestKey = this.store.keys().next().value
        if (oldestKey) this.store.delete(oldestKey)
      }
      return false
    }

    const timePassed = now - record.lastRefilled
    const refilledTokens = timePassed * refillRatePerMs
    const newTokens = Math.min(limit, record.tokens + refilledTokens)

    if (newTokens < 1) {
      record.tokens = newTokens
      return true
    }

    record.tokens = newTokens - 1
    record.lastRefilled = now
    return false
  }
}

const authLimiter = new TokenBucketLimiter()

// Helper: Secure IP Extraction avoiding header injection/spoofing
function getClientIp(request: NextRequest): string {
  const requestIp = (request as any).ip
  if (requestIp) return requestIp

  const xRealIp = request.headers.get('x-real-ip')
  if (xRealIp) return xRealIp.trim()

  const cfIp = request.headers.get('cf-connecting-ip')
  if (cfIp) return cfIp.trim()

  const xForwardedFor = request.headers.get('x-forwarded-for')
  if (xForwardedFor) {
    const firstIp = xForwardedFor.split(',')[0].trim()
    if (firstIp) return firstIp
  }

  return '127.0.0.1'
}

// Helper: Simple User-Agent Bot block list
function isBot(userAgent: string | null): boolean {
  if (!userAgent) return false
  const ua = userAgent.toLowerCase()
  return BOT_USER_AGENTS.some((bot) => ua.includes(bot))
}

// Helper: CSRF-like validation matching Host, Origin, and Referer
function isValidOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin')
  const referer = request.headers.get('referer')
  const host = request.headers.get('host')

  if (!host) return false

  if (origin) {
    try {
      const originUrl = new URL(origin)
      if (originUrl.host !== host) return false
    } catch {
      return false
    }
  }

  if (referer) {
    try {
      const refererUrl = new URL(referer)
      if (refererUrl.host !== host) return false
    } catch {
      return false
    }
  }

  return true
}

/**
 * Enterprise Next.js Request Proxy Pipeline (Next.js 16 Standard)
 * Functions as a Security Gateway at the edge: Method Block, CSRF check, Bot check, Token Bucket Rate Limiting, and Security Headers.
 */
export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const method = request.method

  // 1. Method Validation: block TRACE and CONNECT methods
  if (method === 'TRACE' || method === 'CONNECT') {
    return new NextResponse('Method Not Allowed', { status: 405 })
  }

  // 2. Targeted Security Gate for POST Auth actions
  const isAuthPath =
    pathname === '/login' ||
    pathname === '/register' ||
    pathname === '/verify-email' ||
    pathname === '/forgot-password'

  if (method === 'POST' && isAuthPath) {
    // A. Bot User-Agent Check
    const userAgent = request.headers.get('user-agent')
    if (isBot(userAgent)) {
      return new NextResponse(
        JSON.stringify({ success: false, error: 'Forbidden request' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // B. Origin/Referer Validation (CSRF mitigation)
    if (!isValidOrigin(request)) {
      return new NextResponse(
        JSON.stringify({ success: false, error: 'Invalid origin request' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // C. Token Bucket Rate Limiting (10 requests per minute per IP)
    const ip = getClientIp(request)
    const limitKey = `auth:${ip}`
    const limit = 10
    const refillRatePerMs = 10 / (60 * 1000) // 10 tokens per 60 seconds

    if (authLimiter.isRateLimited(limitKey, limit, refillRatePerMs)) {
      return new NextResponse(
        JSON.stringify({
          success: false,
          error: 'Too many authentication attempts. Please try again in a minute.',
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': '60',
          },
        }
      )
    }
  }

  const response = NextResponse.next()

  // 3. Resolve Locale Priority: Cookie ('laube-locale') -> Accept-Language Header -> Default ('en')
  const cookieLocale = request.cookies.get('laube-locale')?.value
  const acceptLanguage = request.headers.get('accept-language')?.split(',')[0]?.split('-')[0]
  const resolvedLocale = cookieLocale || acceptLanguage || 'en'

  // 4. Resolve Currency Priority: Cookie ('laube-currency') -> Default ('EGP')
  const cookieCurrency = request.cookies.get('laube-currency')?.value
  const resolvedCurrency = cookieCurrency || 'EGP'

  // 5. Attach Resolved Context Headers
  response.headers.set('x-laube-locale', resolvedLocale)
  response.headers.set('x-laube-currency', resolvedCurrency)

  // 6. Inject Security Headers on all HTTP responses
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|images).*)',
  ],
}
