import 'server-only'
import config from '@/payload.config'
import { getPayload } from 'payload'

interface CreateBookingData {
  userId: string | number
  packageId: string | number
  contactEmail: string
  contactPhone: string
  bookingDate: string // ISO date string
  travelersList: Array<{
    fullName: string
    type: 'adult' | 'infant'
    passportNumber?: string
    specialRequests?: string
  }>
  totalPrice: number
  notes?: string
  selectedExcursions?: (string | number)[]
}

/**
 * Create a new booking for a user.
 * Status starts as 'pending' until confirmed by admin or payment.
 */
export const createBooking = async (data: CreateBookingData) => {
  const payload = await getPayload({ config })

  const userId = typeof data.userId === 'number' ? data.userId : parseInt(String(data.userId), 10)
  const packageId =
    typeof data.packageId === 'number' ? data.packageId : parseInt(String(data.packageId), 10)

  if (isNaN(userId) || isNaN(packageId)) {
    throw new Error('Invalid User or Package ID')
  }

  const booking = await payload.create({
    collection: 'bookings',
    data: {
      user: userId,
      package: packageId,
      contactEmail: data.contactEmail,
      contactPhone: data.contactPhone,
      bookingDate: data.bookingDate,
      travelersList: data.travelersList,
      totalPrice: data.totalPrice,
      notes: data.notes,
      selectedExcursions: data.selectedExcursions
        ?.map((id) => (typeof id === 'number' ? id : parseInt(String(id), 10)))
        .filter((id): id is number => !isNaN(id)),
      status: 'pending',
    },
  })

  return booking
}

/**
 * Get all bookings for a specific user
 */
export const getUserBookings = async (userId: string | number) => {
  const payload = await getPayload({ config })
  const numericUserId = typeof userId === 'number' ? userId : parseInt(String(userId), 10)

  if (isNaN(numericUserId)) return []

  const data = await payload.find({
    collection: 'bookings',
    where: {
      user: {
        equals: numericUserId,
      },
    },
    sort: '-createdAt',
    depth: 1, // Populate package details
  })

  return data.docs
}

/**
 * Update booking status (admin action)
 * This triggers the afterChange hook which awards points if status becomes 'completed'
 */
export const updateBookingStatus = async (
  bookingId: string | number,
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled',
) => {
  const payload = await getPayload({ config })
  const numericBookingId =
    typeof bookingId === 'number' ? bookingId : parseInt(String(bookingId), 10)

  if (isNaN(numericBookingId)) {
    throw new Error('Invalid Booking ID')
  }

  const updated = await payload.update({
    collection: 'bookings',
    id: numericBookingId,
    data: {
      status,
    },
  })

  return updated
}
