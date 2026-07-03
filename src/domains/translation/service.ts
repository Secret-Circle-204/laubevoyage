import type { Payload, PayloadRequest } from 'payload'

/**
 * Translation Domain Service
 * Handles auto-translation with persistent database-backed cache
 */
export class TranslationService {
  private payload: Payload

  constructor(payload: Payload) {
    this.payload = payload
  }

  /**
   * Translate text from source language to target language
   */
  async translate(text: string, from: string, to: string, req?: PayloadRequest): Promise<string> {
    if (!text || text.trim() === '') return ''
    if (from === to) return text

    const trimmedText = text.trim()

    try {
      // 1. Check persistent cache in translation-cache collection
      const cached = await this.payload.find({
        collection: 'translation-cache',
        where: {
          and: [
            { sourceText: { equals: trimmedText } },
            { fromLanguage: { equals: from } },
            { toLanguage: { equals: to } },
          ],
        },
        limit: 1,
        req,
      })

      if (cached.docs.length > 0) {
        console.log(`[Translation Service] Cache HIT for: "${trimmedText.substring(0, 20)}..." (${from} -> ${to})`)
        return cached.docs[0].translatedText
      }

      console.log(`[Translation Service] Cache MISS for: "${trimmedText.substring(0, 20)}..." (${from} -> ${to})`)

      // 2. Fetch from Google Translate free endpoint
      const translatedText = await this.fetchGoogleTranslation(trimmedText, from, to)

      // 3. Cache the translation
      await this.payload.create({
        collection: 'translation-cache',
        data: {
          sourceText: trimmedText,
          fromLanguage: from,
          toLanguage: to,
          translatedText,
        },
        req,
      })

      return translatedText
    } catch (error) {
      console.error(`[Translation Service] Failed to translate:`, error)
      throw error // Fail loudly
    }
  }

  /**
   * Execute fetch query to Google Translate API
   */
  private async fetchGoogleTranslation(text: string, from: string, to: string): Promise<string> {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${from}&tl=${to}&dt=t&q=${encodeURIComponent(text)}`

    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Google Translate API returned status ${response.status}`)
    }

    const data = await response.json()
    
    // Google Translate structure: [[[translatedText, sourceText, ...]]]
    if (data && data[0] && data[0][0] && data[0][0][0]) {
      return data[0][0][0]
    }

    throw new Error('Unexpected translation response structure from Google Translate')
  }
}
