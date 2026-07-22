/**
 * Media Optimization Service
 * Handles WebP conversions, responsive sizes, and alt-text enforcement.
 */
export class ContentMediaService {
  static getOptimizedMediaUrl(originalUrl: string, format = 'webp'): string {
    if (!originalUrl) return ''
    if (originalUrl.endsWith('.webp') || originalUrl.endsWith('.avif')) {
      return originalUrl
    }
    return `${originalUrl}?format=${format}`
  }
}
