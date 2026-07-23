import type { Payload } from 'payload'
import type { SeededDestinationsResult } from './destinations.seed'

export async function seedExperiences(payload: Payload, destinations: SeededDestinationsResult): Promise<void> {
  console.log('🌴 [Seed] Seeding Experiences (Packages & Daily Tours)...')

  const cairo = destinations?.cities?.['cairo'] || (destinations as any)?.cairo
  const luxor = destinations?.cities?.['luxor'] || (destinations as any)?.luxor

  if (cairo) {
    try {
      await payload.create({
        collection: 'experiences',
        data: {
          title: 'Cairo & Giza Pyramids - 3 Days Luxury Package',
          slug: 'cairo-pyramids-3-days',
          type: 'package',
          city: cairo.id,
          duration: { days: 3, nights: 2 },
          price: 15000,
          availability: 'available',
          included: [{ item: '5-Star Hotel Accommodation' }, { item: 'Private VIP Egyptologist Guide' }, { item: 'Airport Transfers' }],
          excluded: [{ item: 'International Flights' }, { item: 'Personal Expenses' }],
          isActive: true,
        },
      })
    } catch {}

    try {
      await payload.create({
        collection: 'experiences',
        data: {
          title: 'Pyramids & Grand Egyptian Museum Day Tour',
          slug: 'pyramids-gem-day-tour',
          type: 'daily_tour',
          city: cairo.id,
          duration: { days: 1, nights: 0 },
          price: 3500,
          availability: 'available',
          included: [{ item: 'Private Transportation' }, { item: 'Entry Tickets' }, { item: 'Luxury Lunch' }],
          excluded: [{ item: 'Gratuities' }],
          isActive: true,
        },
      })
    } catch {}
  }

  if (luxor) {
    try {
      await payload.create({
        collection: 'experiences',
        data: {
          title: 'Luxor to Aswan 5-Star Nile Cruise - 4 Days Package',
          slug: 'nile-cruise-luxor-aswan-4-days',
          type: 'package',
          city: luxor.id,
          duration: { days: 4, nights: 3 },
          price: 28000,
          availability: 'available',
          included: [{ item: 'Full Board Nile Cruise Ship' }, { item: 'Temple Sightseeing Excursions' }],
          excluded: [{ item: 'Beverages' }],
          isActive: true,
        },
      })
    } catch {}
  }

  console.log('   ✅ Experiences seeded successfully.')
}
