/**
 * Production Environment Configuration & Validation
 * Single Source of Truth for mandatory runtime environment variables.
 */

export type NodeEnvironment = 'development' | 'production' | 'test'
export type AppEnvironment = 'local' | 'staging' | 'production'

export interface EnvConfig {
  NODE_ENV: NodeEnvironment
  APP_ENV: AppEnvironment
  SESSION_COOKIE_SECURE: boolean
  NEXT_PUBLIC_APP_URL: string
  PAYLOAD_SECRET: string
  DATABASE_URL: string
  INTERNAL_REVALIDATION_TOKEN?: string
  STRIPE_SECRET_KEY?: string
  STRIPE_WEBHOOK_SECRET?: string
}

function resolveNodeEnv(raw?: string): NodeEnvironment {
  if (raw === 'production' || raw === 'development' || raw === 'test') {
    return raw
  }
  if (!raw || raw.trim() === '') {
    return 'development'
  }
  throw new Error(
    `[SECURITY CRITICAL] Invalid NODE_ENV: "${raw}". Must be "development", "production", or "test".`,
  )
}

function resolveAppEnv(raw?: string): AppEnvironment {
  if (raw === 'local' || raw === 'staging' || raw === 'production') {
    return raw
  }
  throw new Error(
    `[SECURITY CRITICAL] Invalid or missing APP_ENV: "${raw}". Must be "local", "staging", or "production".`,
  )
}

function resolveSessionCookieSecure(raw?: string, appEnv?: AppEnvironment): boolean {
  if (appEnv === 'production') {
    if (raw !== 'true') {
      throw new Error(
        '[SECURITY CRITICAL] Production environment strictly requires SESSION_COOKIE_SECURE=true. Insecure session transport is prohibited in production.',
      )
    }
    return true
  }

  if (raw === 'true') {
    return true
  }
  if (raw === 'false') {
    return false
  }

  throw new Error(
    `[SECURITY CRITICAL] Invalid or missing SESSION_COOKIE_SECURE: "${raw}". Must be explicitly configured as "true" or "false".`,
  )
}

export function validateEnv(): EnvConfig {
  const nodeEnv = resolveNodeEnv(process.env.NODE_ENV)
  const appEnv = resolveAppEnv(process.env.APP_ENV)
  const sessionCookieSecure = resolveSessionCookieSecure(process.env.SESSION_COOKIE_SECURE, appEnv)
  const isProd = nodeEnv === 'production'

  const config: EnvConfig = {
    NODE_ENV: nodeEnv,
    APP_ENV: appEnv,
    SESSION_COOKIE_SECURE: sessionCookieSecure,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || '',
    PAYLOAD_SECRET: process.env.PAYLOAD_SECRET || '',
    DATABASE_URL: process.env.DATABASE_URL || '',
    INTERNAL_REVALIDATION_TOKEN: process.env.INTERNAL_REVALIDATION_TOKEN,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
  }

  if (isProd) {
    if (!process.env.PAYLOAD_SECRET) {
      throw new Error(
        '[SECURITY CRITICAL] Missing mandatory PAYLOAD_SECRET environment variable in production.',
      )
    }
    if (!process.env.DATABASE_URL) {
      throw new Error(
        '[SECURITY CRITICAL] Missing mandatory DATABASE_URL environment variable in production.',
      )
    }
    if (
      !process.env.INTERNAL_REVALIDATION_TOKEN ||
      process.env.INTERNAL_REVALIDATION_TOKEN === 'laube-internal-token-2026'
    ) {
      throw new Error(
        '[SECURITY CRITICAL] INTERNAL_REVALIDATION_TOKEN must be a secure, random string in production.',
      )
    }
    if (!process.env.NEXT_PUBLIC_APP_URL) {
      throw new Error(
        '[SECURITY CRITICAL] Missing mandatory NEXT_PUBLIC_APP_URL environment variable in production.',
      )
    }
  }

  return config
}

export const env = validateEnv()
