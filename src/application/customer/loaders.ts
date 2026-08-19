import { getApplicationServices } from '@/application/factory'
import type { CustomerProfileDataDTO, CustomerSettingsDataDTO } from './dto'

export class CustomerProfileLoader {
  static async load(customerId: number): Promise<CustomerProfileDataDTO> {
    try {
      const { customer } = await getApplicationServices()
      const [customerDoc, travelersList, addressesList] = await Promise.all([
        customer.getById(customerId),
        customer.getTravelers(customerId),
        customer.getAddresses(customerId),
      ])

      const travelers = (travelersList || []).map((t) => ({
        id: t.travelerId,
        firstName: t.firstName,
        lastName: t.lastName,
        relationship: t.relationship,
        dateOfBirth: t.dateOfBirth,
        passportNumber: t.passportNumber,
      }))

      const addresses = (addressesList || []).map((a) => ({
        id: a.addressId,
        type: a.type,
        street: a.street,
        city: a.city,
        country: a.country,
        postalCode: a.postalCode,
        isDefault: a.isDefault,
      }))

      return {
        firstName: customerDoc.firstName || '',
        lastName: customerDoc.lastName || '',
        email: customerDoc.email || '',
        phone: customerDoc.phone || undefined,
        passportNumber: customerDoc.passportNumber || undefined,
        nationality: customerDoc.nationality || undefined,
        travelers,
        addresses,
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
      const [customerDoc, sessionsList] = await Promise.all([
        customer.getById(customerId),
        customer.getActiveDeviceSessions(customerId),
      ])

      const prefs = customerDoc.notifications || {
        email: true,
        sms: false,
        push: true,
      }

      const activeSessions = (sessionsList || []).map((s) => ({
        sessionId: s.sessionId,
        deviceName: s.deviceName,
        ipAddress: s.ipAddress,
        lastActiveAt: s.lastActiveAt,
        isRevoked: s.isRevoked,
      }))

      return {
        email: !!prefs.email,
        sms: !!prefs.sms,
        push: !!prefs.push,
        activeSessions,
      }
    } catch (err) {
      console.error(`[CustomerSettingsLoader] Failed loading settings for customer #${customerId}:`, err)
      throw err
    }
  }
}
