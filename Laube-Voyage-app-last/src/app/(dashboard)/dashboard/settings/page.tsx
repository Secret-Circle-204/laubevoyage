import { headers } from 'next/headers'
import { getPayload } from 'payload'
import config from '@/payload.config'
import SettingsClient from './SettingsClient'
import type { User } from '@/payload-types'

/**
 * صفحة الإعدادات - إدارة الملف الشخصي والتفضيلات
 * Settings Page - Profile and preferences management
 */
export default async function SettingsPage() {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })

  if (!user) return null

  return <SettingsClient user={user as User} />
}
