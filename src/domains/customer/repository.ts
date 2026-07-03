import type { Payload, PayloadRequest } from 'payload'
import type { Customer } from '@/payload-types'

/**
 * Customer Repository
 *
 * Decouples the CustomerService from the Payload persistence layer.
 * All database queries for the customers collection go through this repository.
 */
export class CustomerRepository {
  private payload: Payload

  constructor(payload: Payload) {
    this.payload = payload
  }

  async findById(id: number, req?: PayloadRequest): Promise<Customer> {
    return this.payload.findByID({
      collection: 'customers',
      id,
      req,
    })
  }

  async findByEmail(email: string, req?: PayloadRequest): Promise<Customer | null> {
    const result = await this.payload.find({
      collection: 'customers',
      where: {
        email: { equals: email },
      },
      limit: 1,
      req,
    })
    return result.docs[0] || null
  }

  async create(data: any, req?: PayloadRequest): Promise<Customer> {
    return this.payload.create({
      collection: 'customers',
      data,
      req,
    })
  }

  async update(id: number, data: any, req?: PayloadRequest): Promise<Customer> {
    return this.payload.update({
      collection: 'customers',
      id,
      data,
      req,
    })
  }
}
