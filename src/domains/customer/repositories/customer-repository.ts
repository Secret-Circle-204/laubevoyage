import type { Payload, PayloadRequest } from 'payload'
import type { RequestContext, LoyaltyTier } from '@/types'
import type { CustomerAggregate } from '../aggregate'
import type { CustomerStatus } from '../types'
import { validateCustomerStatusTransition } from '../state-machine'
import type { Customer } from '@/payload-types'
import {
  DomainException,
  AuthenticationFailedException,
  AccountLockedException,
  EmailNotVerifiedException,
} from '@/domains/shared/exceptions/domain-exception'

/**
 * Customer Repository
 * Sole data persistence layer for the 'customers' Payload collection.
 */
export class CustomerRepository {
  private payload: Payload

  constructor(payload: Payload) {
    this.payload = payload
  }

  private mapContextToReq(context?: RequestContext): PayloadRequest | undefined {
    if (!context || context.transactionId === null || context.transactionId === undefined) {
      return undefined
    }
    return {
      transactionID: context.transactionId,
    } as unknown as PayloadRequest
  }

  getPayload(): Payload {
    return this.payload
  }

  async authenticateRequest(headers: Headers): Promise<{ id: number; email?: string } | null> {
    if (!this.payload) return null
    try {
      const { user } = await this.payload.auth({ headers })
      if (user) return { id: Number(user.id), email: (user as Record<string, any>).email }
      return null
    } catch {
      return null
    }
  }

  async create(
    data: Record<string, unknown>,
    options?: { eventSource?: 'domain' | 'external' },
    context?: RequestContext,
  ): Promise<CustomerAggregate> {
    const req = this.mapContextToReq(context) || (options?.eventSource ? ({} as any) : undefined)
    if (options?.eventSource && req) {
      if (!req.context) req.context = {}
      req.context.eventSource = options.eventSource
    }

    console.log(`[CustomerRepository.create] Creating customer document. Email: ${data.email}. Transactional Context:`, !!req?.transactionID)
    try {
      const doc = await this.payload.create({
        collection: 'customers',
        data: data as any,
        req,
      })
      console.log(`[CustomerRepository.create] Customer document created successfully. ID: ${doc.id}`)
      return this.mapDocToAggregate(doc)
    } catch (err) {
      console.error(`[CustomerRepository.create] Failed to create customer document. Error:`, err)
      throw err
    }
  }

  async findById(customerId: number, context?: RequestContext): Promise<CustomerAggregate> {
    const req = this.mapContextToReq(context)
    const doc = await this.payload.findByID({
      collection: 'customers',
      id: customerId,
      req,
    })

    return this.mapDocToAggregate(doc)
  }

  async findByEmail(email: string, context?: RequestContext): Promise<CustomerAggregate | null> {
    const req = this.mapContextToReq(context)
    const result = await this.payload.find({
      collection: 'customers',
      where: {
        email: { equals: email.toLowerCase() },
      },
      limit: 1,
      req,
    })

    return result.docs[0] ? this.mapDocToAggregate(result.docs[0]) : null
  }

  async updateStatus(
    customerId: number,
    newStatus: CustomerStatus,
    context?: RequestContext,
  ): Promise<CustomerAggregate> {
    const current = await this.findById(customerId, context)
    validateCustomerStatusTransition(current.status, newStatus)

    const req = this.mapContextToReq(context)
    const doc = await this.payload.update({
      collection: 'customers',
      id: customerId,
      data: {
        status: newStatus as any,
      },
      req,
    })

    return this.mapDocToAggregate(doc)
  }

  async findCustomerIdByEmail(email: string): Promise<number | null> {
    const result = await this.payload.find({
      collection: 'customers',
      where: {
        email: { equals: email.toLowerCase() },
      },
      limit: 1,
      select: {
        email: true,
      },
    })

    return result.docs[0] ? Number(result.docs[0].id) : null
  }

  async findCustomerIdByVerificationToken(token: string): Promise<number | null> {
    const result = await this.payload.find({
      collection: 'customers',
      where: {
        _verificationToken: { equals: token },
      },
      limit: 1,
      overrideAccess: true,
      select: {
        email: true,
      },
    })

    return result.docs[0] ? Number(result.docs[0].id) : null
  }

  async verifyEmailByToken(token: string): Promise<number> {
    const customerId = await this.findCustomerIdByVerificationToken(token)
    if (customerId === null) {
      throw new Error('Verification token is invalid or expired.')
    }

    await this.payload.verifyEmail({
      collection: 'customers',
      token,
    })

    return customerId
  }

  async incrementFailedLoginAttempts(email: string): Promise<number> {
    const db = (this.payload as any).db
    if (db && db.pool && typeof db.pool.query === 'function') {
      try {
        const result = await db.pool.query(
          'UPDATE "customers" SET "failed_login_attempts" = "failed_login_attempts" + 1 WHERE "email" = $1 RETURNING "id", "failed_login_attempts"',
          [email.toLowerCase()],
        )
        const row = result.rows?.[0]
        const attempts = row ? Number(row.failed_login_attempts || 0) : 0

        if (attempts >= 5) {
          const lockedUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString()
          await this.payload.update({
            collection: 'customers',
            id: Number(row.id),
            data: {
              lockedUntil,
            },
          })
        }
        return attempts
      } catch (err) {
        console.error('[CustomerRepository] Failed atomic increment:', err)
      }
    }

    // Fallback/Mock behavior for tests
    const customer = await this.findByEmail(email)
    if (!customer) return 0

    const nextAttempts = customer.failedLoginAttempts + 1
    const data: Record<string, any> = {
      failedLoginAttempts: nextAttempts,
    }
    if (nextAttempts >= 5) {
      data.lockedUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString()
    }

    await this.payload.update({
      collection: 'customers',
      id: customer.customerId,
      data,
    })
    return nextAttempts
  }

  async save(customer: CustomerAggregate, context?: RequestContext): Promise<CustomerAggregate> {
    const req = this.mapContextToReq(context)
    const doc = await this.payload.update({
      collection: 'customers',
      id: customer.customerId,
      data: {
        firstName: customer.firstName,
        lastName: customer.lastName,
        phone: customer.phone,
        passportNumber: customer.passportNumber,
        nationality: customer.nationality,
        status: customer.status as any,
        lastLoginAt: customer.lastLoginAt,
        failedLoginAttempts: customer.failedLoginAttempts,
        lockedUntil: customer.lockedUntil,
        emailVerifiedAt: customer.emailVerifiedAt,
        phoneVerifiedAt: customer.phoneVerifiedAt,
        deletedAt: customer.deletedAt,
        preferences: {
          preferredLanguage: customer.preferredLanguage,
          preferredCurrency: customer.preferredCurrency,
          notifications: customer.notifications || { email: true, sms: false, push: true },
        },
      },
      req,
    })

    return this.mapDocToAggregate(doc)
  }

  async login(
    email: string,
    password?: string,
  ): Promise<{ user: CustomerAggregate; token: string }> {
    try {
      const loginResult = await this.payload.login({
        collection: 'customers',
        data: { email: email.toLowerCase(), password: password || '' },
      })
      if (!loginResult || !loginResult.user || !loginResult.token) {
        throw new AuthenticationFailedException('Invalid email or password')
      }
      return {
        user: this.mapDocToAggregate(loginResult.user),
        token: loginResult.token,
      }
    } catch (err: unknown) {
      if (err instanceof DomainException) {
        throw err
      }
      const errName = (err as any)?.name || (err as any)?.constructor?.name
      const status = (err as any)?.status
      if (errName === 'AuthenticationError' || status === 401 || status === 403) {
        throw new AuthenticationFailedException('Invalid email or password')
      }
      // Re-throw unexpected database / infrastructure errors faithfully
      throw err
    }
  }

  async cleanupProfileAssociatedData(customerId: number, req?: PayloadRequest): Promise<void> {
    const where = { customer: { equals: customerId } }
    const collections = [
      'customer-travelers',
      'customer-addresses',
      'customer-device-sessions',
      'customer-notification-preferences',
      'dashboard-projections',
    ]

    for (const collection of collections) {
      await this.payload.delete({
        collection: collection as any,
        where,
        req,
      })
    }
  }

  async updateLoyaltyProfile(
    customerId: number,
    loyaltyData: {
      tier?: LoyaltyTier
      points?: number
      totalSpent?: number
      tierAchievedAt?: string
    },
    context?: RequestContext,
  ): Promise<void> {
    const req = this.mapContextToReq(context)
    const customerDoc = await this.payload.findByID({
      collection: 'customers',
      id: customerId,
      req,
    })
    await this.payload.update({
      collection: 'customers',
      id: customerId,
      data: {
        loyalty: {
          ...customerDoc.loyalty,
          ...loyaltyData,
          tier: (loyaltyData.tier || customerDoc.loyalty?.tier) as any,
        },
      },
      req,
    })
  }

  mapPayloadUser(customer: Customer): CustomerAggregate {
    return this.mapDocToAggregate(customer)
  }

  private mapDocToAggregate(doc: Customer): CustomerAggregate {
    const firstName = doc.firstName || ''
    const lastName = doc.lastName || ''

    return {
      customerId: Number(doc.id),
      email: doc.email || '',
      firstName,
      lastName,
      fullName: `${firstName} ${lastName}`.trim(),
      phone: doc.phone || undefined,
      passportNumber: doc.passportNumber || undefined,
      nationality: doc.nationality || undefined,
      isEmailVerified: !!doc.emailVerifiedAt || doc._verified === true,
      isPhoneVerified: !!doc.phoneVerifiedAt,
      status: (doc.status as CustomerStatus) || 'pending_verification',
      preferredCurrency: doc.preferences?.preferredCurrency || 'EGP',
      preferredLanguage: doc.preferences?.preferredLanguage || 'en',
      notifications: {
        email: doc.preferences?.notifications?.email ?? true,
        sms: doc.preferences?.notifications?.sms ?? false,
        push: doc.preferences?.notifications?.push ?? true,
      },
      lastLoginAt: doc.lastLoginAt ? new Date(doc.lastLoginAt).toISOString() : undefined,
      failedLoginAttempts: doc.failedLoginAttempts || 0,
      lockedUntil: doc.lockedUntil ? new Date(doc.lockedUntil).toISOString() : undefined,
      deletedAt: doc.deletedAt ? new Date(doc.deletedAt).toISOString() : undefined,
      emailVerifiedAt: doc.emailVerifiedAt
        ? new Date(doc.emailVerifiedAt).toISOString()
        : undefined,
      phoneVerifiedAt: doc.phoneVerifiedAt
        ? new Date(doc.phoneVerifiedAt).toISOString()
        : undefined,
      loyalty: doc.loyalty
        ? {
            tier: doc.loyalty.tier || '',
            points: typeof doc.loyalty.points === 'number' ? doc.loyalty.points : 0,
            totalSpentEGP: typeof doc.loyalty.totalSpent === 'number' ? doc.loyalty.totalSpent : 0,
            totalSpent: typeof doc.loyalty.totalSpent === 'number' ? doc.loyalty.totalSpent : 0,
          }
        : undefined,
      version: 1,
      createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : new Date().toISOString(),
      updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : new Date().toISOString(),
    }
  }
}
