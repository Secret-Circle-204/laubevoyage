import type { GlobalAfterChangeHook } from 'payload'
import { systemSettingsRegistry } from '@/domains/system/settings-registry'

export const afterSystemSettingsChange: GlobalAfterChangeHook = async ({ doc }) => {
  console.log('[SystemSettingsHook] Invalidating system settings registry cache')
  systemSettingsRegistry.invalidate()
  return doc
}
