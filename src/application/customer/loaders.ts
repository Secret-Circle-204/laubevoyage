import { getApplicationServices } from '@/application/factory'
import type { CustomerProfileDataDTO, CustomerSettingsDataDTO } from './dto'

export class CustomerProfileLoader {
  static async load(customerId: number): Promise<CustomerProfileDataDTO> {
    try {
      const { customer } = await getApplicationServices()
      const [customerDoc, savedCompanions] = await Promise.all([
        customer.getById(customerId),
        customer.getSavedCompanions(customerId),
      ])

      const travelers = (savedCompanions || []).map((t) => ({
        id: String(t.travelerId),
        firstName: t.firstName,
        lastName: t.lastName,
        relationship: t.relationship.charAt(0).toUpperCase() + t.relationship.slice(1),
        dateOfBirth: t.dateOfBirth,
        passportNumber: t.passportNumber,
      }))

      return {
        firstName: customerDoc.firstName || '',
        lastName: customerDoc.lastName || '',
        email: customerDoc.email || '',
        phone: customerDoc.phone || undefined,
        passportNumber: customerDoc.passportNumber || undefined,
        nationality: customerDoc.nationality || undefined,
        travelers,
        totalCompanions: travelers.length,
      }
    } catch (err) {
      console.error(`[CustomerProfileLoader] Failed loading profile for customer #${customerId}:`, err)
      throw err
    }
  }
}

export class CustomerSettingsLoader {
  static async load(customerId: number): Promise<CustomerSettingsDataDTO> {
    try {
      const { customer } = await getApplicationServices()
      const customerDoc = await customer.getById(customerId)

      const prefs = customerDoc.notifications || {
        email: true,
        sms: false,
        push: true,
      }

      return {
        email: !!prefs.email,
        sms: !!prefs.sms,
        push: !!prefs.push,
      }
    } catch (err) {
      console.error(`[CustomerSettingsLoader] Failed loading settings for customer #${customerId}:`, err)
      throw err
    }
  }
}
