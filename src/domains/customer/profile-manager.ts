import { TravelerRepository } from './repositories/traveler-repository'
import { AddressRepository } from './repositories/address-repository'
import type { CompanionTravelerEntity, CustomerAddressEntity } from './types'

/**
 * Profile Manager Sub-Service
 * Manages companion traveler profiles and customer addresses using dedicated repositories.
 */
export class ProfileManager {
  private travelerRepo: TravelerRepository
  private addressRepo: AddressRepository

  constructor(travelerRepo: TravelerRepository, addressRepo: AddressRepository) {
    this.travelerRepo = travelerRepo
    this.addressRepo = addressRepo
  }

  async getTravelers(customerId: number): Promise<CompanionTravelerEntity[]> {
    return this.travelerRepo.findByCustomerId(customerId)
  }

  async addTraveler(traveler: Omit<CompanionTravelerEntity, 'travelerId'>): Promise<CompanionTravelerEntity> {
    return this.travelerRepo.addTraveler(traveler)
  }

  async getAddresses(customerId: number): Promise<CustomerAddressEntity[]> {
    return this.addressRepo.findByCustomerId(customerId)
  }

  async addAddress(address: Omit<CustomerAddressEntity, 'addressId'>): Promise<CustomerAddressEntity> {
    return this.addressRepo.addAddress(address)
  }
}
