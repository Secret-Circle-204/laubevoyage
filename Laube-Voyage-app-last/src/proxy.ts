import { NextRequest, NextResponse } from 'next/server'

/**
 * Next.js Middleware runs on the Edge Runtime.
 * We must avoid importing the full Payload config here to prevent Node.js API conflicts (like fs/file-type).
 * Security remains robust as the actual token verification happens in the Dashboard Layout (Server Component).
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Secure /dashboard routes
  if (pathname.startsWith('/dashboard')) {
    // Check for the existence of the Payload auth token
    const token = request.cookies.get('payload-token')?.value

    if (!token) {
      const loginUrl = new URL('/login', request.url)
      // Pass the original URL as a redirect param if desired
      return NextResponse.redirect(loginUrl)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*'],
}
