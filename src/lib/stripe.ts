import Stripe from 'stripe'

export function getStripeClient(): Stripe {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY
  if (!stripeSecretKey) {
    throw new Error('[Stripe] STRIPE_SECRET_KEY is missing from environment variables!')
  }
  return new Stripe(stripeSecretKey)
}

export const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : (null as unknown as Stripe)
