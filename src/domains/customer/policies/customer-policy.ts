export class CustomerPolicy {
  /**
   * Verify if a customer owns a booking record (Portal Security)
   */
  public static canAccessBooking(authenticatedCustomerId: number | string, bookingCustomerId: number | string): boolean {
    if (!authenticatedCustomerId || !bookingCustomerId) return false
    return String(authenticatedCustomerId) === String(bookingCustomerId)
  }

  /**
   * Verify customer status is active
   */
  public static canCreateBooking(customerStatus: string): boolean {
    return customerStatus === 'active'
  }
}
