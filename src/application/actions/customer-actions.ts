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

    const cookieStore = await cookies()
    const preferredLanguage = cookieStore.get('laube-locale')?.value
    const preferredCurrency = cookieStore.get('laube-currency')?.value

    // 1. Register customer via the Domain Service (which manages DB creation and event publishing)
    const registeredCustomer = await customer.registerCustomer(
      formData.email,
      formData.firstName,
      formData.lastName,
      formData.password,
      { preferredLanguage, preferredCurrency },
      { eventSource: 'domain' },
    )

    const customerId = registeredCustomer.customerId

    // 3. Log in the newly registered user and set session cookie
    const customerProfile = await customer.getProfile(customerId)

    return {
      success: true,
      requiresVerification: true,
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

    const { customer } = await getDomainServices()

    // 1. Verify credentials via Customer Domain Service
    const loginResult = await customer.loginWithPassword(email, password)

    if (!loginResult || !loginResult.user || !loginResult.token) {
      return { success: false, error: 'Invalid email or password' }
    }

    const customerId = loginResult.user.customerId

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
    const message = error instanceof Error ? error.message : 'Customer login failed'

    // Call domain service to increment failed login attempts, unless account was already locked
    if (!message.toLowerCase().includes('locked')) {
      try {
        const { customer } = await getDomainServices()
        await customer.handleFailedLogin(email)
      } catch (err) {
        console.error('[loginCustomerAction] Error tracking failed login:', err)
      }
    }

    return {
      success: false,
      error: message,
    }
  }
}

export async function verifyEmailAction(token: string, email?: string) {
  try {
    if (!token) {
      return { success: false, error: 'Token is required' }
    }

    const { customer } = await getDomainServices()
    const result = await customer.verifyEmail(token, email)

    if (result.status === 'VERIFIED') {
      return {
        success: true,
        customer: {
          id: result.customer.customerId,
          fullName: result.customer.fullName,
          email: result.customer.email,
        },
      }
    } else if (result.status === 'ALREADY_VERIFIED') {
      return {
        success: true,
        alreadyVerified: true,
        customer: {
          id: result.customer.customerId,
          fullName: result.customer.fullName,
          email: result.customer.email,
        },
      }
    } else {
      return {
        success: false,
        error: result.error,
      }
    }
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Email verification failed',
    }
  }
}

export async function logoutCustomerAction() {
  try {
    const cookieStore = await cookies()
    cookieStore.delete('payload-token')
    return { success: true }
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Logout failed',
    }
  }
}
