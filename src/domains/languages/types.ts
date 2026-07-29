export interface Language {
  id: string
  name: string
  nativeName: string
  code: string
  isRTL: boolean
  isActive: boolean
  isDefault: boolean
  displayOrder: number
  preferredDisplayCurrencyCode?: string | null
}
