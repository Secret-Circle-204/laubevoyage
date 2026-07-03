import { UserRole, UserStatus } from '@/types'
import type { Payload } from 'payload'
import { LoyaltyService } from '../loyalty/service'

/**
 * User Domain Service
 * Handles user lifecycle and authentication
 */
export class UserService {
  private payload: Payload
  private loyaltyService: LoyaltyService

  constructor(payload: Payload) {
    this.payload = payload
    this.loyaltyService = new LoyaltyService(payload)
  }

  /**
   * Register new user
   */
  async register(data: {
    email: string
    password: string
    firstName: string
    lastName: string
    phone?: string
  }): Promise<number> {
    // Create user
    const user = await this.payload.create({
      collection: 'users',
      data: {
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone || null,
        role: 'customer',
        status: 'pending_verification',
        loyalty: {
          tier: 'explorer',
          points: 0,
          totalSpent: 0,
        },
      },
    })

    // Grant welcome bonus
    await this.loyaltyService.grantWelcomeBonus(user.id)

    return user.id
  }

  /**
   * Verify user email
   */
  async verifyEmail(userId: number): Promise<void> {
    await this.payload.update({
      collection: 'users',
      id: userId,
      data: {
        status: 'active',
        _verified: true,
      },
    })
  }

  /**
   * Get user profile
   */
  async getProfile(userId: number) {
    const user = await this.payload.findByID({
      collection: 'users',
      id: userId,
    })

    // Get real-time points balance from ledger
    const realBalance = await this.loyaltyService.getBalance(userId)

    return {
      ...user,
      loyalty: {
        ...user.loyalty,
        points: realBalance, // Use real balance from ledger
      },
    }
  }

  /**
   * Update user profile
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
  ) {
    return this.payload.update({
      collection: 'users',
      id: userId,
      data,
    })
  }

  /**
   * Get user by email
   */
  async getByEmail(email: string) {
    const result = await this.payload.find({
      collection: 'users',
      where: {
        email: {
          equals: email,
        },
      },
      limit: 1,
    })

    return result.docs[0] || null
  }

  /**
   * Suspend user account
   */
  async suspend(userId: number, reason: string): Promise<void> {
    await this.payload.update({
      collection: 'users',
      id: userId,
      data: {
        status: 'suspended',
      },
    })
  }

  /**
   * Reactivate user account
   */
  async reactivate(userId: number): Promise<void> {
    await this.payload.update({
      collection: 'users',
      id: userId,
      data: {
        status: 'active',
      },
    })
  }
}

