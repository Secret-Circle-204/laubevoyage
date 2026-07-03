import 'server-only'
import config from '@/payload.config'
import { getPayload } from 'payload'

export const getBookingData = async () => {
  try {
    const payload = await getPayload({ config })
    
    const [destinations, packages, excursions] = await Promise.all([
      payload.find({
        collection: 'destinations',
        limit: 100,
        depth: 0,
      }),
      payload.find({
        collection: 'packages',
        limit: 100,
        depth: 1, // Populate destination
      }),
      payload.find({
        collection: 'excursions',
        limit: 100,
        depth: 0,
      })
    ])
    
    return {
      destinations: destinations.docs,
      packages: packages.docs,
      excursions: excursions.docs
    }
  } catch (error) {
    console.error("Payload error in getBookingData:", error)
    return { destinations: [], packages: [] }
  }
}
