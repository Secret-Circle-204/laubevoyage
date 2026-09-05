import { getApplicationServices } from '@/application/factory'
import type { CustomerProfileDataDTO, CustomerSettingsDataDTO } from './dto'

export class CustomerProfileLoader {
  static async load(customerId: number): Promise<CustomerProfileDataDTO> {
    try {
      const { customer, booking } = await getApplicationServices()
      const [customerDoc, companionResult] = await Promise.all([
        customer.getById(customerId),
        booking.getCustomerCompanionTravelers(customerId, { page: 1, limit: 20 }),
      ])

      const travelers = (companionResult.data || []).map((t) => ({
        id: t.id,
        firstName: t.firstName,
        lastName: t.lastName,
        relationship: 'Companion',
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
        totalCompanions: companionResult.total,
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
