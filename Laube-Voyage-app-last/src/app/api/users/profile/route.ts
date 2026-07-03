import { getPayload } from 'payload'
import config from '@/payload.config'
import { NextResponse } from 'next/server'
import { headers } from 'next/headers'

/**
 * تحديث بيانات المستخدم الحالي
 * Update current user profile data
 */
export async function PATCH(request: Request) {
  try {
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: await headers() })

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name } = body

    const updated = await payload.update({
      collection: 'users',
      id: user.id,
      data: {
        ...(name && { name }),
      },
      user,
      overrideAccess: false,
    })

    return NextResponse.json({
      success: true,
      user: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
      },
    })
  } catch (error: unknown) {
    console.error('User PATCH error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to update profile'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

/**
 * جلب بيانات المستخدم الحالي
 * Get current user data
 */
export async function GET() {
  try {
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: await headers() })

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      loyaltyTier: user.loyaltyTier,
      loyaltyPoints: user.loyaltyPoints,
      isVerified: user.isVerified,
    })
  } catch (error: unknown) {
    console.error('User GET error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch user'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
