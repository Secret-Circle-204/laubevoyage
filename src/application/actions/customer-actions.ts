'use server'

import { getPayload } from 'payload'
import config from '@payload-config'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { getDomainServices } from '@/domains/factory'
import { SessionResolver } from '@/application/auth/session-resolver'
import { DomainException } from '@/domains/shared/exceptions/domain-exception'
import { env } from '@/lib/env'

export interface RegisterFormData {
  email: string
  firstName: string
  lastName: string
  password?: string
  phone: string
}

export async function registerCustomerAction(formData: RegisterFormData) {
  try {
    const email = formData.email ? formData.email.toLowerCase().trim() : ''
    const firstName = formData.firstName ? formData.firstName.trim() : ''
    const lastName = formData.lastName ? formData.lastName.trim() : ''
    const phone = formData.phone ? formData.phone.trim() : ''
    const password = formData.password

    if (!email || !firstName || !lastName || !phone || !password) {
      return { success: false, error: 'Email, First Name, Last Name, Phone Number, and Password are required' }
    }

    const payload = await getPayload({ config })
    const { customer } = await getDomainServices()

    const cookieStore = await cookies()
    const preferredLanguage = cookieStore.get('laube-locale')?.value
    const preferredCurrency = cookieStore.get('laube-currency')?.value

    // 1. Register customer via the Domain Service (which manages DB creation and event publishing)
    const registeredCustomer = await customer.registerCustomer(
      email,
      firstName,
      lastName,
      phone,
      password,
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
    const message = error instanceof Error ? error.message : 'Customer registration failed'
    const code = error instanceof DomainException ? error.code : undefined

    return {
      success: false,
      error: message,
      code,
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
      secure: env.SESSION_COOKIE_SECURE,
      sameSite: 'lax',
      path: '/',
    })

    const canonicalSession = {
      isAuthenticated: true,
      customerId: user.customerId,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      tier: user.loyalty?.tier,
      points: user.loyalty?.points,
      role: 'customer' as const,
    }

    return {
      success: true,
      customerId: user.customerId,
      email: user.email,
      fullName: user.fullName,
      session: canonicalSession,
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

export async function getCurrentSessionAction(): Promise<{
  success: boolean
  session?: {
    isAuthenticated: boolean
    customerId?: number
    email?: string
    firstName?: string
    lastName?: string
    tier?: string
    points?: number
    role?: 'admin' | 'super_admin' | 'customer'
  }
  error?: string
}> {
  try {
    const resolved = await SessionResolver.resolve()
    if (!resolved.isAuthenticated) {
      return {
        success: true,
        session: { isAuthenticated: false },
      }
    }
    return {
      success: true,
      session: {
        isAuthenticated: true,
        customerId: resolved.customerId,
        email: resolved.email,
        firstName: resolved.firstName,
        lastName: resolved.lastName,
        tier: resolved.tier,
        points: resolved.points,
        role: resolved.role,
      },
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Session revalidation failed'
    console.error('[getCurrentSessionAction] Failed to resolve session from server:', err)
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

export async function resendVerificationAction(email: string) {
  try {
    const trimmedEmail = email ? email.toLowerCase().trim() : ''
    if (!trimmedEmail) {
      return { success: false, error: 'Email address is required' }
    }

    const { customer } = await getDomainServices()
    const result = await customer.resendVerification(trimmedEmail)

    if (result.status === 'SENT') {
      return {
        success: true,
        message: 'A verification link has been sent to your email.',
      }
    } else if (result.status === 'ALREADY_VERIFIED') {
      return {
        success: false,
        alreadyVerified: true,
        error: 'Your email address is already verified. You can sign in directly.',
      }
    } else if (result.status === 'RATE_LIMITED') {
      return {
        success: false,
        rateLimited: true,
        error: 'Too many verification requests. Please wait a moment before trying again.',
      }
    } else if (result.status === 'EXPIRED') {
      return {
        success: false,
        expired: true,
        error: 'The verification period has expired. Please register again to activate your account.',
      }
    } else {
      // Privacy-safe response for non-existent accounts
      return {
        success: true,
        message: 'If an account exists with this email, a verification link has been sent.',
      }
    }
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to resend verification email',
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

export async function getTravelerRegistryAction(options?: {
  page?: number
  limit?: number
  search?: string
}) {
  try {
    const session = await SessionResolver.resolve()
    // Accessible by staff / admins
    if (!session.isAuthenticated || (session.role !== 'admin' && session.role !== 'super_admin')) {
      return { success: false, error: 'Unauthorized: Staff access required for Traveler Registry' }
    }

    const { customer } = await getDomainServices()
    const result = await customer.getTravelersReport(options)
    return { success: true, ...result }
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to query traveler registry',
    }
  }
}

export async function saveCustomerCompanionAction(params: {
  firstName: string
  lastName: string
  email?: string
  phone?: string
  dateOfBirth?: string
  passportNumber?: string
  nationality?: string
  relationship: 'spouse' | 'child' | 'parent' | 'friend' | 'self' | 'other'
}) {
  try {
    const session = await SessionResolver.resolve()
    if (!session.isAuthenticated || !session.customerId) {
      return { success: false, error: 'Unauthorized' }
    }

    const { customer } = await getDomainServices()
    const travelerRepo = new (await import('@/domains/customer/repositories/traveler-repository')).TravelerRepository(
      (customer as any).repository.getPayload(),
    )

    const canonical = await travelerRepo.resolveOrCreateCanonicalTraveler({
      firstName: params.firstName,
      lastName: params.lastName,
      email: params.email,
      phone: params.phone,
      dateOfBirth: params.dateOfBirth,
      passportNumber: params.passportNumber,
      nationality: params.nationality,
    })

    await customer.saveCompanion(session.customerId, canonical.id, params.relationship)
    revalidatePath('/dashboard/profile')

    return { success: true, travelerId: canonical.id }
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save companion',
    }
  }
}
