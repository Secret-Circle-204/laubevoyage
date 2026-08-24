'use server'

import { getPayload } from 'payload'
import config from '@payload-config'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { getDomainServices } from '@/domains/factory'
import { SessionResolver } from '@/application/auth/session-resolver'
import { DomainException } from '@/domains/shared/exceptions/domain-exception'

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

    // Authenticate and execute post-auth rules within the Customer Domain
    const { user, token } = await customer.loginWithPassword(email, password)

    // Set HTTP-only session cookie
    const cookieStore = await cookies()
    cookieStore.set('payload-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    })

    return {
      success: true,
      customerId: user.customerId,
      email: user.email,
      fullName: user.fullName,
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Customer login failed'
    const code = error instanceof DomainException ? error.code : undefined

    return {
      success: false,
      error: message,
      code,
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

export async function setLocaleAction(locale: string) {
  try {
    const cookieStore = await cookies()
    cookieStore.set('laube-locale', locale, {
      path: '/',
      maxAge: 31536000,
      sameSite: 'lax',
    })
    return { success: true }
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to set locale',
    }
  }
}

export async function setCurrencyAction(currency: string) {
  try {
    const cookieStore = await cookies()
    cookieStore.set('laube-currency', currency, {
      path: '/',
      maxAge: 31536000,
      sameSite: 'lax',
    })
    return { success: true }
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to set currency',
    }
  }
}

export async function updateCustomerProfileAction(params: {
  firstName: string
  lastName: string
  phone?: string
  passportNumber?: string
  nationality?: string
}) {
  try {
    const session = await SessionResolver.resolve()
    if (!session.isAuthenticated || !session.customerId) {
      return { success: false, error: 'Unauthorized' }
    }

    const { customer } = await getDomainServices()

    // Retrieve active customer aggregate
    const aggregate = await customer.getById(session.customerId)
    if (!aggregate) {
      return { success: false, error: 'Customer profile not found' }
    }

    // Apply updates to aggregate fields
    aggregate.firstName = params.firstName
    aggregate.lastName = params.lastName
    aggregate.phone = params.phone
    aggregate.passportNumber = params.passportNumber
    aggregate.nationality = params.nationality

    // Persist via Customer Domain Service
    const updated = await customer.saveProfile(aggregate)

    // Revalidate paths to refresh rendering
    revalidatePath('/dashboard/profile')
    revalidatePath('/dashboard')

    return {
      success: true,
      customer: {
        id: updated.customerId,
        fullName: updated.fullName,
        phone: updated.phone,
        passportNumber: updated.passportNumber,
        nationality: updated.nationality,
      },
    }
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update profile',
    }
  }
}

export async function updateCustomerPreferencesAction(params: {
  notifications: { email: boolean; sms: boolean; push: boolean }
}) {
  try {
    const session = await SessionResolver.resolve()
    if (!session.isAuthenticated || !session.customerId) {
      return { success: false, error: 'Unauthorized' }
    }

    const { customer } = await getDomainServices()

    const aggregate = await customer.getById(session.customerId)
    if (!aggregate) {
      return { success: false, error: 'Customer not found' }
    }

    aggregate.notifications = params.notifications

    await customer.saveProfile(aggregate)

    revalidatePath('/dashboard/settings')

    return { success: true }
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update preferences',
    }
  }
}
