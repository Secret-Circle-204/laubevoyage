import type { Payload, PayloadRequest } from 'payload'
import { LoyaltyService } from '../loyalty/service'
import type { Customer } from '@/payload-types'

/**
 * User Domain Service
 * Handles customer/traveler lifecycle and authentication
 */
export class UserService {
  private payload: Payload
  private loyaltyService: LoyaltyService

  constructor(payload: Payload) {
    this.payload = payload
    this.loyaltyService = new LoyaltyService(payload)
  }

  /**
   * Register new customer
   */
  async register(
    data: {
      email: string
      password: string
      firstName: string
      lastName: string
      phone?: string
    },
    req?: PayloadRequest,
  ): Promise<number> {
    // Create customer
    const customer = await this.payload.create({
      collection: 'customers',
      data: {
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone || null,
        status: 'pending_verification',
        loyalty: {
          tier: 'explorer',
          points: 0,
          totalSpent: 0,
        },
      },
      req,
    })

    return customer.id
  }

  /**
   * Verify customer email
   */
  async verifyEmail(userId: number, req?: PayloadRequest): Promise<void> {
    await this.payload.update({
      collection: 'customers',
      id: userId,
      data: {
        status: 'active',
        _verified: true,
      },
      req,
    })
  }

  /**
   * Get customer profile
   */
  async getProfile(userId: number, req?: PayloadRequest) {
    const customer = await this.payload.findByID({
      collection: 'customers',
      id: userId,
      req,
    })

    // Get real-time points balance from ledger
    const realBalance = await this.loyaltyService.getBalance(userId, req)

    return {
      ...customer,
      loyalty: {
        ...customer.loyalty,
        points: realBalance, // Use real balance from ledger
      },
    }
  }

  /**
   * Update customer profile
   */
  async updateProfile(
    userId: number,
    data: {
      firstName?: string
      lastName?: string
      phone?: string
      preferences?: {
        locale?: 'en' | 'ar' | 'fr'
        currency?: 'EGP' | 'USD' | 'EUR' | 'AED' | 'SAR'
        notifications?: {
          email?: boolean
          sms?: boolean
          push?: boolean
        }
      }
    },
    req?: PayloadRequest,
  ) {
    return this.payload.update({
      collection: 'customers',
      id: userId,
      data,
      req,
    })
  }

  /**
   * Get customer by email
   */
  async getByEmail(email: string, req?: PayloadRequest) {
    const result = await this.payload.find({
      collection: 'customers',
      where: {
        email: {
          equals: email,
        },
      },
      limit: 1,
      req,
    })

    return result.docs[0] || null
  }

  /**
   * Suspend customer account
   */
  async suspend(userId: number, reason: string, req?: PayloadRequest): Promise<void> {
    await this.payload.update({
      collection: 'customers',
      id: userId,
      data: {
        status: 'suspended',
      },
      req,
    })
  }

  /**
   * Reactivate customer account
   */
  async reactivate(userId: number, req?: PayloadRequest): Promise<void> {
    await this.payload.update({
      collection: 'customers',
      id: userId,
      data: {
        status: 'active',
      },
      req,
    })
  }
}
