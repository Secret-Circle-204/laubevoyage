import type { Payload, PayloadRequest } from 'payload'
import type { CustomerAggregate } from '../aggregate'
import type { CustomerStatus } from '../types'
import { validateCustomerStatusTransition } from '../state-machine'

/**
 * Customer Repository
 * Sole data persistence layer for the 'customers' Payload collection.
 */
export class CustomerRepository {
  private payload: Payload

  constructor(payload: Payload) {
    this.payload = payload
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
  ): Promise<CustomerAggregate> {
    const req = options?.eventSource
      ? ({
          context: { eventSource: options.eventSource },
        } as any)
      : undefined

    const doc = await this.payload.create({
      collection: 'customers',
      data: data as any,
      req,
    })

    return this.mapDocToAggregate(doc)
  }

  async findById(customerId: number, req?: PayloadRequest): Promise<CustomerAggregate> {
    const doc = await this.payload.findByID({
      collection: 'customers',
      id: customerId,
      req,
    })

    return this.mapDocToAggregate(doc)
  }

  async findByEmail(email: string, req?: PayloadRequest): Promise<CustomerAggregate | null> {
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
    req?: PayloadRequest,
  ): Promise<CustomerAggregate> {
    const current = await this.findById(customerId, req)
    validateCustomerStatusTransition(current.status, newStatus)

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

  async save(customer: CustomerAggregate, req?: PayloadRequest): Promise<CustomerAggregate> {
    const doc = await this.payload.update({
      collection: 'customers',
      id: customer.customerId,
      data: {
        firstName: customer.firstName,
        lastName: customer.lastName,
        phone: customer.phone,
        status: customer.status as any,
        lastLoginAt: customer.lastLoginAt,
        failedLoginAttempts: customer.failedLoginAttempts,
        lockedUntil: customer.lockedUntil,
        emailVerifiedAt: customer.emailVerifiedAt,
        phoneVerifiedAt: customer.phoneVerifiedAt,
        deletedAt: customer.deletedAt,
      },
      req,
    })

    return this.mapDocToAggregate(doc)
  }

  async login(email: string, password?: string): Promise<{ user: CustomerAggregate; token: string } | null> {
    try {
      const loginResult = await this.payload.login({
        collection: 'customers',
        data: { email, password: password || '' },
      })
      if (!loginResult.user || !loginResult.token) return null
      return {
        user: this.mapDocToAggregate(loginResult.user),
        token: loginResult.token,
      }
    } catch {
      return null
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
    loyaltyData: { tier?: 'explorer' | 'voyager' | 'elite'; points?: number; totalSpent?: number; tierAchievedAt?: string },
    req?: PayloadRequest,
  ): Promise<void> {
    const customerDoc = await this.payload.findByID({ collection: 'customers', id: customerId, req })
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

  private mapDocToAggregate(doc: Record<string, any>): CustomerAggregate {
    const firstName = doc.firstName || ''
    const lastName = doc.lastName || ''

    return {
      customerId: Number(doc.id),
      email: doc.email || '',
      firstName,
      lastName,
      fullName: `${firstName} ${lastName}`.trim(),
      phone: doc.phone || undefined,
      isEmailVerified: !!doc.emailVerifiedAt || doc._verified === true,
      isPhoneVerified: !!doc.phoneVerifiedAt,
      status: (doc.status as CustomerStatus) || 'pending_verification',
      preferredCurrency: doc.preferences?.preferredCurrency || 'EGP',
      preferredLanguage: doc.preferences?.preferredLanguage || 'en',
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
      version: 1,
      createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : new Date().toISOString(),
      updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : new Date().toISOString(),
    }
  }
}
