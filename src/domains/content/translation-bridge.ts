/**
 * Content Data Helper
 * Pure content domain helper. Translation is performed exclusively at the Presentation Gateway (LocalizationService).
 */
export class ContentDataHelper {
  static formatContentKey(section: string, slug: string): string {
    return `content.${section}.${slug}`
  }
}
