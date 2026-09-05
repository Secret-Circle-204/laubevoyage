'use server'

import { getDomainServices } from '@/domains/factory'

export async function submitContactRequestAction(params: {
  name: string
  email: string
  subject: string
  message: string
}) {
  const { content, notification } = await getDomainServices()
  return content.submitContactRequest(params, notification)
}
