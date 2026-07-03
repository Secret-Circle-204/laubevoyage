import type { Payload, PayloadRequest } from 'payload'
import type { TranslationCache } from '@/payload-types'

/**
 * Translation Repository
 *
 * Decouples the TranslationService from the Payload persistence layer.
 * All database queries for the translation-cache collection go through this repository.
 */
export class TranslationRepository {
  private payload: Payload

  constructor(payload: Payload) {
    this.payload = payload
  }

  async findByHashAndLanguage(
    originalHash: string,
    language: string,
    minVersion: number,
    req?: PayloadRequest,
  ): Promise<TranslationCache | null> {
    const result = await this.payload.find({
      collection: 'translation-cache',
      where: {
        and: [
          { originalHash: { equals: originalHash } },
          { language: { equals: language } },
          { version: { greater_than_equal: minVersion } },
          { expiresAt: { greater_than: new Date().toISOString() } },
        ],
      },
      limit: 1,
      req,
    })
    return result.docs[0] || null
  }

  async create(data: any, req?: PayloadRequest): Promise<TranslationCache> {
    return this.payload.create({
      collection: 'translation-cache',
      data,
      req,
    })
  }
}
