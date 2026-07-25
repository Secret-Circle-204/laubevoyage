'use server'

import { getPayload } from 'payload'
import config from '@payload-config'
import { cookies } from 'next/headers'
import { getDomainServices } from '@/domains/factory'

export interface RegisterFormData {
  email: string
  firstName: string
  lastName: string
  password?: string
}

export async function registerCustomerAction(formData: RegisterFormData) {
  try {
    if (!formData.email || !formData.firstName || !formData.lastName || !formData.password) {
      return { success: false, error: 'Email, First Name, Last Name, and Password are required' }
    }

    const payload = await getPayload({ config })
    const { customer } = await getDomainServices()

    // 1. Register customer via the Domain Service (which manages DB creation and event publishing)
    const registeredCustomer = await customer.registerCustomer(
      formData.email,
      formData.firstName,
      formData.lastName,
      formData.password,
      { eventSource: 'domain' }
    )

    const customerId = registeredCustomer.customerId

    // 3. Log in the newly registered user and set session cookie
    if (formData.password) {
      const loginResult = await payload.login({
        collection: 'customers',
        data: {
          email: formData.email,
          password: formData.password,
        },
      })

      if (loginResult.token) {
        const cookieStore = await cookies()
        cookieStore.set('payload-token', loginResult.token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
        })
      }
    }

    const customerProfile = await customer.getProfile(customerId)

    return {
      success: true,
      customerId: customerProfile.customerId,
      email: customerProfile.email,
      fullName: customerProfile.fullName,
    }
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Customer registration failed',
    }
  }
}

export async function loginCustomerAction(email: string, password?: string) {
  try {
    if (!email || !password) {
      return { success: false, error: 'Email and password are required' }
    }

    const payload = await getPayload({ config })
    const { customer } = await getDomainServices()

    // 1. Verify credentials via Payload Infrastructure
    const loginResult = await payload.login({
      collection: 'customers',
      data: { email, password },
    })

    if (!loginResult.user || !loginResult.token) {
      return { success: false, error: 'Invalid email or password' }
    }

    const customerId = Number(loginResult.user.id)

    // 2. Execute Domain post-authentication policies and activity log
    const customerAccount = await customer.onCustomerAuthenticated(customerId)

    // 3. Set HTTP-only session cookie
    const cookieStore = await cookies()
    cookieStore.set('payload-token', loginResult.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    })

    return {
      success: true,
      customerId: customerAccount.customerId,
      email: customerAccount.email,
      fullName: customerAccount.fullName,
    }
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Customer login failed',
    }
  }
}
