import 'server-only'
import { getCompanySettings } from '@/services/globals'
import ContactClient from './ContactClient'

export default async function ContactPage() {
  const settings = await getCompanySettings()

  return (
    <ContactClient
      settings={{
        email: settings?.email || undefined,
        phone: settings?.phone || undefined,
        address: settings?.address || undefined,
        instagram: settings?.instagram || undefined,
        facebook: settings?.facebook || undefined,
        linkedin: settings?.linkedin || undefined,
      }}
    />
  )
}
