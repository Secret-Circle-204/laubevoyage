import type { Payload } from 'payload'

export interface FaqSeedDef {
  faqId: string
  category: 'booking' | 'cancellation' | 'payment' | 'loyalty'
  question: string
  answer: string
  order: number
}

export const PRODUCTION_FAQS: FaqSeedDef[] = [
  {
    faqId: 'faq-luxury-inclusions',
    category: 'booking',
    order: 1,
    question: "What luxury services and amenities are included in L'Aube Voyage packages?",
    answer:
      "All L'Aube Voyage bespoke travel packages include private VIP airport meet-and-greet services, dedicated Mercedes-Benz luxury transfers, certified private Egyptologist and local master tour guides, all monument and exhibition entrance fees, hand-selected 5-star palace hotel or luxury cruise accommodations, and 24/7 dedicated concierge support.",
  },
  {
    faqId: 'faq-bespoke-customization',
    category: 'booking',
    order: 2,
    question: 'Can I customize the daily itinerary or departure timing of my journey?',
    answer:
      'Yes. Our luxury private tours and packages are fully bespoke. Your dedicated private guide and chauffeur will adjust daily departure hours, sightseeing pace, and dining arrangements to match your personal preferences seamlessly.',
  },
  {
    faqId: 'faq-cancellation-terms',
    category: 'cancellation',
    order: 3,
    question: 'What is the cancellation and refund policy for luxury packages and daily tours?',
    answer:
      'For Daily Tours, cancellations made at least 24 hours prior to scheduled departure receive a 100% full refund. For Multi-Day Packages, cancellations made up to 7 days before the commencement date are fully refundable without penalty. Flexible Date packages allow date adjustments up to 48 hours before arrival.',
  },
  {
    faqId: 'faq-payment-currencies-gateways',
    category: 'payment',
    order: 4,
    question: 'What payment methods and currencies are supported for booking settlement?',
    answer:
      'We accept all major international payment cards (Visa, Mastercard, American Express) processed securely via Stripe, local Egyptian card and digital wallet settlements via Paymob, and Book Now Pay Later (BNPL) options. Prices are quoted in your preferred currency with transparent, real-time institutional exchange rates.',
  },
  {
    faqId: 'faq-loyalty-privileges',
    category: 'loyalty',
    order: 5,
    question: 'How do I earn and redeem privileges in the L’Aube Voyage Loyalty Program?',
    answer:
      'Clients earn 1 loyalty point for every 100 EGP spent on eligible bookings. Points can be redeemed directly in your Customer Portal Dashboard for instant booking discounts, luxury airport transfer upgrades, or tier status progression across Explorer, Voyager, and Elite memberships.',
  },
]

export interface SeededFaqsResult {
  totalProcessed: number
  totalCreated: number
  totalUpdated: number
}

/**
 * Master Enterprise FAQs Seeder.
 * Deterministically creates/reconciles customer service and policy FAQs.
 */
export async function seedFaqs(payload: Payload): Promise<SeededFaqsResult> {
  console.log('❓ [Seed] Seeding Production FAQs Catalog...')

  let totalCreated = 0
  let totalUpdated = 0

  for (const faq of PRODUCTION_FAQS) {
    const existing = await payload.find({
      collection: 'faqs',
      where: {
        faqId: { equals: faq.faqId },
      },
      limit: 1,
    })

    if (existing.docs.length > 0) {
      await payload.update({
        collection: 'faqs',
        id: existing.docs[0].id,
        data: faq,
      })
      totalUpdated++
    } else {
      await payload.create({
        collection: 'faqs',
        data: faq,
      })
      totalCreated++
    }
  }

  console.log(`   ✅ FAQs Catalog Processed: ${PRODUCTION_FAQS.length} items (${totalCreated} created, ${totalUpdated} updated).`)

  return {
    totalProcessed: PRODUCTION_FAQS.length,
    totalCreated,
    totalUpdated,
  }
}
