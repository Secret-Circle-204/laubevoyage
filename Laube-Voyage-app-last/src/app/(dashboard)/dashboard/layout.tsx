import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/services/dashboard'
import DashboardShell from '@/components/dashboard/DashboardShell'
import type { User } from '@/payload-types'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser(await headers())

  if (!user) {
    redirect('/login')
  }

  if (!user.isVerified) {
    redirect(`/verify?email=${encodeURIComponent(user.email || '')}`)
  }

  return <DashboardShell user={user as User}>{children}</DashboardShell>
}
