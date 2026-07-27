/**
 * Production Environment Configuration & Validation
 * Ensures mandatory production environment variables are present and valid on server initialization.
 */

export interface EnvConfig {
  NODE_ENV: 'development' | 'production' | 'test'
  APP_URL: string
  PAYLOAD_SECRET: string
  DATABASE_URI: string
  STRIPE_SECRET_KEY?: string
  STRIPE_WEBHOOK_SECRET?: string
  PAYMOB_API_KEY?: string
  PAYMOB_HMAC_SECRET?: string
}

export function validateEnv(): EnvConfig {
  const isProd = process.env.NODE_ENV === 'production'

  const config: EnvConfig = {
    NODE_ENV: process.env.NODE_ENV as any,
    APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    PAYLOAD_SECRET: process.env.PAYLOAD_SECRET,
    DATABASE_URI: process.env.DATABASE_URI,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    PAYMOB_API_KEY: process.env.PAYMOB_API_KEY,
    PAYMOB_HMAC_SECRET: process.env.PAYMOB_HMAC_SECRET,
  }

  if (isProd) {
    if (!process.env.PAYLOAD_SECRET) {
      throw new Error(
        '[SECURITY CRITICAL] Missing mandatory PAYLOAD_SECRET environment variable in production.',
      )
    }
    if (!process.env.DATABASE_URI) {
      throw new Error(
        '[SECURITY CRITICAL] Missing mandatory DATABASE_URI environment variable in production.',
      )
    }
  }

  return config
}

export const env = validateEnv()
