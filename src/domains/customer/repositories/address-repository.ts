import type { Payload, PayloadRequest } from 'payload'
import type { CustomerAddressEntity } from '../types'

/**
 * Address Repository
 * Sole data persistence layer for the 'customer-addresses' Payload collection.
 */
export class AddressRepository {
  private payload: Payload

  constructor(payload: Payload) {
    this.payload = payload
  }

  async findByCustomerId(customerId: number, req?: PayloadRequest): Promise<CustomerAddressEntity[]> {
    const result = await this.payload.find({
      collection: 'customer-addresses',
      where: {
        customer: { equals: customerId },
      },
      limit: 50,
      req,
    })

    return result.docs.map((doc: any) => ({
      addressId: String(doc.id),
      customerId: typeof doc.customer === 'object' ? Number(doc.customer.id) : Number(doc.customer),
      type: doc.type || 'home',
      street: doc.street,
      city: doc.city,
      country: doc.country,
      postalCode: doc.postalCode || undefined,
      isDefault: doc.isDefault ?? false,
    }))
  }

  async addAddress(address: Omit<CustomerAddressEntity, 'addressId'>, req?: PayloadRequest): Promise<CustomerAddressEntity> {
    const doc = await this.payload.create({
      collection: 'customer-addresses',
      data: {
        customer: address.customerId,
        type: address.type,
        street: address.street,
        city: address.city,
        country: address.country,
        postalCode: address.postalCode,
        isDefault: address.isDefault,
      },
      req,
    })

    return {
      addressId: String(doc.id),
      customerId: address.customerId,
      type: doc.type || 'home',
      street: doc.street,
      city: doc.city,
      country: doc.country,
      postalCode: doc.postalCode || undefined,
      isDefault: doc.isDefault ?? false,
    }
  }
}
