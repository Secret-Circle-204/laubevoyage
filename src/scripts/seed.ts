import { getPayload } from 'payload'
import config from '@payload-config'

export async function seedDatabase() {
  console.log('[Seeder] Starting Payload CMS Database Seeding Engine...')
  const payload = await getPayload({ config })

  // 1. Seed Country: Egypt
  console.log('[Seeder] Seeding Country: Egypt...')
  const egyptDoc = await payload.create({
    collection: 'countries',
    data: {
      name: 'Egypt',
      slug: 'egypt',
      description: 'The cradle of civilization, home to the Pyramids, Luxor temples, and the majestic Nile.' as any,
      isActive: true,
      experiencesCount: 3,
    } as any,
  })

  // 2. Seed Cities
  console.log('[Seeder] Seeding Cities: Cairo, Luxor, Aswan, Sharm El Sheikh...')
  const cairoCity = await payload.create({
    collection: 'cities',
    data: {
      name: 'Cairo',
      slug: 'cairo',
      country: egyptDoc.id,
      description: 'Historic capital featuring Giza Pyramids, Saqqara, and Grand Egyptian Museum.' as any,
      isActive: true,
      experiencesCount: 1,
    } as any,
  })

  const luxorCity = await payload.create({
    collection: 'cities',
    data: {
      name: 'Luxor',
      slug: 'luxor',
      country: egyptDoc.id,
      description: 'The world’s greatest open-air museum with Karnak and Valley of the Kings.' as any,
      isActive: true,
      experiencesCount: 1,
    } as any,
  })

  const aswanCity = await payload.create({
    collection: 'cities',
    data: {
      name: 'Aswan',
      slug: 'aswan',
      country: egyptDoc.id,
      description: 'Serene Nubian culture, Philae Temple, and gateway to Nile cruises.' as any,
      isActive: true,
      experiencesCount: 0,
    } as any,
  })

  const sharmCity = await payload.create({
    collection: 'cities',
    data: {
      name: 'Sharm El Sheikh',
      slug: 'sharm-el-sheikh',
      country: egyptDoc.id,
      description: 'Red Sea paradise famous for luxury beach resorts and world-class diving.' as any,
      isActive: true,
      experiencesCount: 1,
    } as any,
  })

  // 3. Seed Experiences (Package & Daily Tour)
  console.log('[Seeder] Seeding Experiences...')
  await payload.create({
    collection: 'experiences',
    data: {
      title: 'Private Giza Pyramids & Saqqara VIP Day Tour',
      slug: 'giza-pyramids-private-tour',
      type: 'daily_tour',
      city: cairoCity.id,
      basePriceEGP: 8500,
      durationDays: 1,
      rating: 5.0,
      reviewsCount: 112,
      status: 'published',
      availability: 'available',
      capacityTotal: 15,
      isActive: true,
    } as any,
  })

  await payload.create({
    collection: 'experiences',
    data: {
      title: '5-Day Luxury Nile Cruise: Luxor to Aswan',
      slug: 'luxor-aswan-nile-cruise-5-days',
      type: 'package',
      city: luxorCity.id,
      basePriceEGP: 35000,
      durationDays: 5,
      rating: 4.9,
      reviewsCount: 198,
      status: 'published',
      availability: 'available',
      capacityTotal: 20,
      isActive: true,
    } as any,
  })

  await payload.create({
    collection: 'experiences',
    data: {
      title: '7-Day Red Sea All-Inclusive Luxury Escape',
      slug: 'sharm-red-sea-luxury-resort-7-days',
      type: 'package',
      city: sharmCity.id,
      basePriceEGP: 48000,
      durationDays: 7,
      rating: 4.8,
      reviewsCount: 76,
      status: 'published',
      availability: 'available',
      capacityTotal: 10,
      isActive: true,
    } as any,
  })

  // 4. Seed Posts (Blog Articles)
  console.log('[Seeder] Seeding Blog Articles...')
  await payload.create({
    collection: 'posts',
    data: {
      title: 'The Ultimate Guide to Luxury Nile Cruises',
      slug: 'luxury-nile-cruises-guide',
      category: 'Nile Cruises',
      readTimeMinutes: 7,
      status: 'published',
      publishedAt: new Date().toISOString(),
    } as any,
  })

  await payload.create({
    collection: 'posts',
    data: {
      title: 'Private Archaeology: Exploring Giza & Saqqara in Comfort',
      slug: 'cairo-pyramids-private-tours',
      category: 'Guides',
      readTimeMinutes: 5,
      status: 'published',
      publishedAt: new Date().toISOString(),
    } as any,
  })

  // 5. Seed FAQs
  console.log('[Seeder] Seeding FAQs...')
  await payload.create({
    collection: 'faqs',
    data: {
      question: 'What is included in a luxury tour package?',
      answer: 'All our tour packages include private luxury transfers, 5-star hotel or Nile cruise accommodations, licensed English/multilingual Egyptologist guides, and VIP entrance tickets.',
      category: 'booking',
    } as any,
  })

  await payload.create({
    collection: 'faqs',
    data: {
      question: 'Can I customize my daily tour itinerary?',
      answer: 'Yes! All daily tours and packages are 100% customizable. You can adjust departure times, add private lunches, or extend visits to specific historical sites.',
      category: 'booking',
    } as any,
  })

  console.log('[Seeder] ✅ Database Seeding Completed Successfully!')
}

if (require.main === module) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[Seeder] Error seeding database:', err)
      process.exit(1)
    })
}
