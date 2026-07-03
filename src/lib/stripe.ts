import Stripe from 'stripe'

const stripeSecretKey = process.env.STRIPE_SECRET_KEY

if (!stripeSecretKey && process.env.NODE_ENV === 'production') {
  throw new Error('STRIPE_SECRET_KEY is missing in production environment!')
}

export const stripe = new Stripe(stripeSecretKey || 'sk_test_placeholder')
