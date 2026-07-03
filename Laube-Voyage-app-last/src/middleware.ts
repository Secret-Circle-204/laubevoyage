import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Routes that require authentication
const protectedRoutes = ['/dashboard']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Check if the route requires protection
  const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route))

  if (isProtectedRoute) {
    // Check for Payload auth cookie
    const payloadToken = request.cookies.get('payload-token')

    if (!payloadToken) {
      // Redirect to login with return URL
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    // Match dashboard routes
    '/dashboard/:path*',
  ],
}
