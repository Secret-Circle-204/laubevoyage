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

  async create(data: any, req?: PayloadRequest): Promise<any> {
    return this.payload.create({
      collection: 'customers',
      data,
      req,
    })
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

  private mapDocToAggregate(doc: any): CustomerAggregate {
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
      emailVerifiedAt: doc.emailVerifiedAt ? new Date(doc.emailVerifiedAt).toISOString() : undefined,
      phoneVerifiedAt: doc.phoneVerifiedAt ? new Date(doc.phoneVerifiedAt).toISOString() : undefined,
      version: 1,
      createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : new Date().toISOString(),
      updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : new Date().toISOString(),
    }
  }
}
