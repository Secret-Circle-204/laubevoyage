import type { Payload } from 'payload'

export async function seedFaqs(payload: Payload): Promise<void> {
  console.log('❓ [Seed] Seeding FAQs...')

  const faqs = [
    {
      question: 'What is included in L\'Aube Voyage luxury packages?',
      answer: 'All our tour packages include private luxury transportation, 5-star hotel or cruise accommodations, entry tickets to ancient sites, and dedicated VIP Egyptologist guides.',
    },
    {
      question: 'How does the Loyalty Points Program work?',
      answer: 'You earn 1 loyalty point for every 100 EGP spent. Points can be redeemed for booking discounts or tier upgrades in your Customer Portal Dashboard.',
    },
    {
      question: 'What payment methods do you accept?',
      answer: 'We accept major international credit cards (Visa, Mastercard, American Express via Stripe), local Egypt card & wallet payments via Paymob, and Book Now Pay Later options.',
    },
  ]

  for (const faq of faqs) {
    try {
      await payload.create({
        collection: 'faqs',
        data: faq,
      })
    } catch {}
  }

  console.log('   ✅ FAQs seeded successfully.')
}
