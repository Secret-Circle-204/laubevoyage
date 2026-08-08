import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const allCookies = request.cookies.getAll()
  const allHeaders: Record<string, string> = {}
  request.headers.forEach((value, key) => {
    allHeaders[key] = value
  })

  console.log('[TestCookiesRoute] Received GET request')
  console.log('Cookies:', JSON.stringify(allCookies, null, 2))
  console.log('Headers:', JSON.stringify(allHeaders, null, 2))

  return NextResponse.json({
    success: true,
    cookies: allCookies,
    headers: allHeaders,
  })
}
