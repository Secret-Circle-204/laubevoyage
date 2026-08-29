import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { AzureTranslatorProvider } from '../../../src/domains/translation/providers/azure-provider'
import { CloudflareTranslatorProvider } from '../../../src/domains/translation/providers/cloudflare-provider'
import { GoogleCloudTranslationProvider } from '../../../src/domains/translation/providers/google-cloud-provider'

describe('Production Cloud Translation Adapters', () => {
  const originalFetch = global.fetch

  afterEach(() => {
    global.fetch = originalFetch
    vi.restoreAllMocks()
  })

  // --------------------------------------------------------------------------
  // AZURE TRANSLATOR ADAPTER
  // --------------------------------------------------------------------------
  describe('AzureTranslatorProvider', () => {
    it('should correctly format request headers, body and parse translation response', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => [
          { translations: [{ text: 'معبد الأقصر', to: 'ar' }] },
          { translations: [{ text: 'رحلة النيل', to: 'ar' }] },
        ],
      })
      global.fetch = mockFetch as any

      const provider = new AzureTranslatorProvider({
        apiKey: 'test-azure-key',
        region: 'eastus',
      })

      expect(provider.isConfigured()).toBe(true)

      const results = await provider.translateBatch(['Luxor Temple', 'Nile Cruise'], 'ar', 'en')
      expect(results).toEqual(['معبد الأقصر', 'رحلة النيل'])

      expect(mockFetch).toHaveBeenCalledTimes(1)
      const [url, options] = mockFetch.mock.calls[0]
      expect(url).toContain('api-version=3.0')
      expect(url).toContain('to=ar')
      expect(url).toContain('from=en')
      expect(options.headers['Ocp-Apim-Subscription-Key']).toBe('test-azure-key')
      expect(options.headers['Ocp-Apim-Subscription-Region']).toBe('eastus')
      expect(JSON.parse(options.body)).toEqual([{ Text: 'Luxor Temple' }, { Text: 'Nile Cruise' }])
    })

    it('should throw error with status 429 and parse retry-after header on rate limit', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        headers: new Headers({ 'retry-after': '30' }),
        text: async () => 'Out of quota',
      }) as any

      const provider = new AzureTranslatorProvider({ apiKey: 'key' })
      try {
        await provider.translateText('Hello', 'ar')
        expect.unreachable('Should have thrown')
      } catch (err: any) {
        expect(err.status).toBe(429)
        expect(err.retryAfter).toBe('30')
      }
    })

    it('should throw explicit error if unconfigured', async () => {
      const provider = new AzureTranslatorProvider({ apiKey: '' })
      expect(provider.isConfigured()).toBe(false)
      await expect(provider.translateText('Hello', 'ar')).rejects.toThrow('missing AZURE_TRANSLATOR_KEY')
    })
  })

  // --------------------------------------------------------------------------
  // CLOUDFLARE WORKERS AI ADAPTER
  // --------------------------------------------------------------------------
  describe('CloudflareTranslatorProvider', () => {
    it('should send correct authorization header and parse Workers AI response', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          result: { translated_text: 'معبد الأقصر' },
        }),
      })
      global.fetch = mockFetch as any

      const provider = new CloudflareTranslatorProvider({
        accountId: 'test-account-id',
        apiToken: 'test-cf-token',
      })

      expect(provider.isConfigured()).toBe(true)

      const result = await provider.translateText('Luxor Temple', 'ar', 'en')
      expect(result).toBe('معبد الأقصر')

      const [url, options] = mockFetch.mock.calls[0]
      expect(url).toContain('/accounts/test-account-id/ai/run/@cf/meta/m2m100-1.2b')
      expect(options.headers['Authorization']).toBe('Bearer test-cf-token')
      expect(JSON.parse(options.body)).toEqual({
        text: 'Luxor Temple',
        source_lang: 'english',
        target_lang: 'arabic',
      })
    })

    it('should map 429 error correctly', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Rate Limit Exceeded',
        headers: new Headers(),
        text: async () => 'Daily allocation exceeded',
      }) as any

      const provider = new CloudflareTranslatorProvider({
        accountId: 'acc',
        apiToken: 'tok',
      })

      try {
        await provider.translateText('Hello', 'ar')
        expect.unreachable('Should have thrown')
      } catch (err: any) {
        expect(err.status).toBe(429)
      }
    })
  })

  // --------------------------------------------------------------------------
  // GOOGLE CLOUD TRANSLATION ADAPTER
  // --------------------------------------------------------------------------
  describe('GoogleCloudTranslationProvider', () => {
    it('should send POST request with API key, decode HTML entities and validate cardinality', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          data: {
            translations: [
              { translatedText: 'فندق L&#39;Aube &amp; منتجع' },
              { translatedText: 'شرم الشيخ' },
            ],
          },
        }),
      })
      global.fetch = mockFetch as any

      const provider = new GoogleCloudTranslationProvider({
        apiKey: 'test-google-key',
      })

      expect(provider.isConfigured()).toBe(true)

      const results = await provider.translateBatch(
        ["L'Aube Hotel & Resort", 'Sharm El Sheikh'],
        'ar',
        'en'
      )

      // Invariant: HTML entities decoded properly
      expect(results).toEqual(["فندق L'Aube & منتجع", 'شرم الشيخ'])

      const [url, options] = mockFetch.mock.calls[0]
      expect(url).toContain('key=test-google-key')
      expect(JSON.parse(options.body)).toEqual({
        q: ["L'Aube Hotel & Resort", 'Sharm El Sheikh'],
        source: 'en',
        target: 'ar',
        format: 'text',
      })
    })

    it('should throw error on cardinality mismatch', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          data: {
            translations: [{ translatedText: 'فقط واحد' }],
          },
        }),
      }) as any

      const provider = new GoogleCloudTranslationProvider({ apiKey: 'key' })
      await expect(provider.translateBatch(['Text 1', 'Text 2'], 'ar')).rejects.toThrow(
        'Cardinality mismatch'
      )
    })
  })
})
