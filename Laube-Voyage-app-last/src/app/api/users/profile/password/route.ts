import { getPayload } from 'payload'
import config from '@/payload.config'
import { NextResponse } from 'next/server'
import { headers } from 'next/headers'

/**
 * تغيير كلمة مرور المستخدم
 * Change user password
 */
export async function POST(request: Request) {
  try {
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: await headers() })

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { currentPassword, newPassword } = body

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Both passwords are required' }, { status: 400 })
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'New password must be at least 8 characters' },
        { status: 400 },
      )
    }

    // Verify current password by attempting login
    try {
      await payload.login({
        collection: 'users',
        data: {
          email: user.email!,
          password: currentPassword,
        },
      })
    } catch {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 })
    }

    // Update password
    await payload.update({
      collection: 'users',
      id: user.id,
      data: {
        password: newPassword,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Password updated successfully',
    })
  } catch (error: unknown) {
    console.error('Password change error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to change password'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
