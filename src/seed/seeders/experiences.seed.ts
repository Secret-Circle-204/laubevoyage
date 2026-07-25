import type { Payload } from 'payload'
import type { SeededDestinationsResult } from './destinations.seed'

export async function seedExperiences(payload: Payload, destinations: SeededDestinationsResult): Promise<void> {
  console.log('🌴 [Seed] Seeding Experiences (Packages & Daily Tours)...')

  const cairo = destinations?.cities?.['cairo'] || (destinations as any)?.cairo
  const luxor = destinations?.cities?.['luxor'] || (destinations as any)?.luxor

  const experiencesToSeed = [
    {
      title: 'Cairo & Giza Pyramids - 3 Days Luxury Package',
      slug: 'cairo-pyramids-3-days',
      type: 'package' as const,
      city: cairo?.id,
      duration: { days: 3, nights: 2 },
      price: 15000,
      availability: 'available' as const,
      included: [{ item: '5-Star Hotel Accommodation' }, { item: 'Private VIP Egyptologist Guide' }, { item: 'Airport Transfers' }],
      excluded: [{ item: 'International Flights' }, { item: 'Personal Expenses' }],
      isActive: true,
    },
    {
      title: 'Pyramids & Grand Egyptian Museum Day Tour',
      slug: 'pyramids-gem-day-tour',
      type: 'daily_tour' as const,
      city: cairo?.id,
      duration: { days: 1, nights: 0 },
      price: 3500,
      availability: 'available' as const,
      included: [{ item: 'Private Transportation' }, { item: 'Entry Tickets' }, { item: 'Luxury Lunch' }],
      excluded: [{ item: 'Gratuities' }],
      isActive: true,
    },
    {
      title: 'Luxor to Aswan 5-Star Nile Cruise - 4 Days Package',
      slug: 'nile-cruise-luxor-aswan-4-days',
      type: 'package' as const,
      city: luxor?.id,
      duration: { days: 4, nights: 3 },
      price: 28000,
      availability: 'available' as const,
      included: [{ item: 'Full Board Nile Cruise Ship' }, { item: 'Temple Sightseeing Excursions' }],
      excluded: [{ item: 'Beverages' }],
      isActive: true,
    }
  ]

  for (const item of experiencesToSeed) {
    try {
      // Check if experience already exists
      const existingExp = await payload.find({
        collection: 'experiences',
        where: {
          slug: { equals: item.slug },
        },
        limit: 1,
      })

      let expDoc = existingExp.docs[0]

      if (!expDoc) {
        if (!item.city) continue
        // 1. Create Experience if not exists
        expDoc = await payload.create({
          collection: 'experiences',
          data: item,
        })
      }

      // 2. Create corresponding Slots in the database
      const slots = [
        {
          departureId: `slot-1-${expDoc.id}`,
          experience: expDoc.id,
          date: '2026-09-15',
          startTime: '09:00',
          basePriceEGP: expDoc.price,
          capacityTotal: 20,
          capacityReserved: 12,
          capacitySold: 0,
          capacityAvailable: 8,
          version: 1,
          status: 'available' as const,
        },
        {
          departureId: `slot-2-${expDoc.id}`,
          experience: expDoc.id,
          date: '2026-10-01',
          startTime: '09:00',
          basePriceEGP: expDoc.price,
          capacityTotal: 20,
          capacityReserved: 8,
          capacitySold: 0,
          capacityAvailable: 12,
          version: 1,
          status: 'available' as const,
        }
      ]

      for (const slot of slots) {
        try {
          const existingSlot = await payload.find({
            collection: 'departure-slots',
            where: {
              departureId: { equals: slot.departureId },
            },
            limit: 1,
          })

          if (existingSlot.docs.length === 0) {
            await payload.create({
              collection: 'departure-slots',
              data: slot,
            })
          }
        } catch (err) {
          console.error(`      ⚠️ Error seeding slot ${slot.departureId}:`, err)
        }
      }

    } catch (err) {
      console.error(`      ⚠️ Error seeding experience ${item.title}:`, err)
    }
  }

  console.log('   ✅ Experiences and Departure Slots seeded successfully.')
}
