import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'
import fs from 'fs'
import util from 'util'

// Intercept console outputs to write filtered booking/payment logs to a separate file
// Get-Content -Path logs/payments-bnpl.log -Wait -Tail 50

if (typeof window === 'undefined') {
  const globalAny = globalThis as any
  const logDir = path.resolve(process.cwd(), 'logs')
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true })
  }
  const logFilePath = path.resolve(logDir, 'payments-bnpl.log')

  if (!globalAny.__PAYLOAD_LOG_INTERCEPTED__) {
    globalAny.__PAYLOAD_LOG_INTERCEPTED__ = true
    globalAny.__ORIGINAL_CONSOLE_LOG__ = console.log
    globalAny.__ORIGINAL_CONSOLE_WARN__ = console.warn
    globalAny.__ORIGINAL_CONSOLE_ERROR__ = console.error

    // Truncate file on server boot for a clean session
    fs.writeFileSync(logFilePath, `--- Log session started at ${new Date().toISOString()} ---\n`)

    const filterTags = [
      // '[Booking',
      // '[Payment',
      '[Cron',
      // '[Loyalty',
      // '[Point',
      // '[point',
      // '[Ledger',
      // '[ledger',
      // '[Hold',
      // '[hold',
      // '[Refund',
      // '[refund',
      // '[Reversal',
      // '[Reverse',
      // '[reverse',
      // '[Redemption',
      // '[Redeem',
      // '[redeem',
      // '[BNPL',
      // '[bnpl',
      '[Reconciliation',
      '[EventBus',
      '[Outbox',
      // '[Inbox',
      // '[Stripe',
      // '[CHECKOUT',
      // '[checkout',
      // '[CustomerLoyalty',
      // '[BookingDetails',
      // '[Dashboard',
      // 'BOOKING_',
      // 'PAYMENT_',
      // 'LOYALTY_',
      // 'REFUND_',
      '[FORENSIC-DIAG',
      '[Translation',
      '[TRANSLATION_CACHE_MUTATED',
    ]

    const ignoreTags = ['[LoyaltyProgramRegistry.getProgram]']

    const intercept = (original: typeof console.log, type: string) => {
      return (...args: any[]) => {
        original(...args)
        const formatted = args
          .map((arg) =>
            typeof arg === 'object' && arg !== null
              ? util.inspect(arg, { depth: null, colors: false })
              : String(arg),
          )
          .join(' ')
        const shouldIgnore = ignoreTags.some((tag) => formatted.includes(tag))
        if (!shouldIgnore && filterTags.some((tag) => formatted.includes(tag))) {
          fs.appendFileSync(logFilePath, `[${new Date().toISOString()}] [${type}] ${formatted}\n`)
        }
      }
    }

    console.log = intercept(globalAny.__ORIGINAL_CONSOLE_LOG__, 'LOG')
    console.warn = intercept(globalAny.__ORIGINAL_CONSOLE_WARN__, 'WARN')
    console.error = intercept(globalAny.__ORIGINAL_CONSOLE_ERROR__, 'ERROR')
  }
}
import { emailNotificationAdapter } from './domains/notification/providers/email-adapter'
import { systemSettingsRegistry } from './domains/system/settings-registry'

import { Users } from './collections/Users'
import { Customers } from './collections/Customers'
import { Media } from './collections/Media'
import { Countries } from './collections/Countries'
import { Cities } from './collections/Cities'
import { Accommodations } from './collections/Accommodations'
import { Experiences } from './collections/Experiences'
import { Bookings } from './collections/Bookings'
import { PointLedger } from './collections/PointLedger'
import { ExchangeRates } from './collections/ExchangeRates'
import { Currencies } from './collections/Currencies'
import { TranslationCache } from './collections/TranslationCache'
import { AdminAuditLogs } from './collections/AdminAuditLogs'
import { CustomerNotificationPreferences } from './collections/CustomerNotificationPreferences'
import { CustomerTravelers } from './collections/CustomerTravelers'
import { DashboardProjections } from './collections/DashboardProjections'
import { Faqs } from './collections/Faqs'
import { MaintenanceLogs } from './collections/MaintenanceLogs'
import { MediaGallery } from './collections/MediaGallery'
import { NotificationLogs } from './collections/NotificationLogs'
import { Pages } from './collections/Pages'
import { PaymentTransactions } from './collections/PaymentTransactions'
import { Posts } from './collections/Posts'
import { Redirects } from './collections/Redirects'
import { Reviews } from './collections/Reviews'
import { Coupons } from './collections/Coupons'
import { DepartureSlots } from './collections/DepartureSlots'
import { Languages } from './collections/Languages'
import { EventOutbox } from './collections/EventOutbox'
import { EventInbox } from './collections/EventInbox'
import { MaintenanceLeases } from './collections/MaintenanceLeases'
import { ContactRequests } from './collections/ContactRequests'
import { SystemSettings } from './globals/SystemSettings'
import { LoyaltySettings } from './globals/LoyaltySettings'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

function normalizeAndValidateOrigin(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return null
  }
  const normalized = trimmed.replace(/\/+$/, '')
  try {
    const parsed = new URL(normalized)
    if (
      parsed.origin === normalized &&
      (parsed.pathname === '/' || parsed.pathname === '') &&
      parsed.search === '' &&
      parsed.hash === '' &&
      parsed.username === '' &&
      parsed.password === ''
    ) {
      return parsed.origin
    }
  } catch {
    return null
  }
  return null
}

function buildCsrfOrigins(): string[] {
  const isProduction = process.env.NODE_ENV === 'production' || process.env.APP_ENV === 'production'
  const origins = new Set<string>()

  const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL
  if (serverUrl) {
    const validServerOrigin = normalizeAndValidateOrigin(serverUrl)
    if (validServerOrigin) {
      origins.add(validServerOrigin)
    }
  }

  if (!isProduction) {
    const rawDevOrigins = process.env.ALLOWED_DEV_ORIGINS
    if (rawDevOrigins) {
      const parsedOrigins = rawDevOrigins
        .split(',')
        .map(normalizeAndValidateOrigin)
        .filter((origin): origin is string => origin !== null)

      for (const origin of parsedOrigins) {
        origins.add(origin)
      }
    }
  }

  return Array.from(origins)
}

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [
    Users,
    Customers,
    Media,
    Countries,
    Cities,
    Accommodations,
    Experiences,
    Bookings,
    PointLedger,
    ExchangeRates,
    Currencies,
    TranslationCache,
    AdminAuditLogs,
    CustomerNotificationPreferences,
    CustomerTravelers,
    DashboardProjections,
    Faqs,
    MaintenanceLogs,
    MediaGallery,
    NotificationLogs,
    Pages,
    PaymentTransactions,
    Posts,
    Redirects,
    Reviews,
    Coupons,
    ContactRequests,
    Languages,
    DepartureSlots,
    EventOutbox,
    EventInbox,
    MaintenanceLeases,
  ],
  globals: [SystemSettings, LoyaltySettings],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL || '',
    },
    push:
      process.env.NODE_ENV !== 'production' &&
      process.env.VITEST !== 'true' &&
      process.env.PAYLOAD_DISABLE_PUSH !== 'true',
    migrationDir: path.resolve(dirname, 'migrations'),
  }),
  serverURL: process.env.NEXT_PUBLIC_SERVER_URL,
  csrf: buildCsrfOrigins(),
  sharp,
  email: () => ({
    name: 'payload-auth-email-adapter',
    defaultFromAddress: '',
    defaultFromName: '',
    sendEmail: async (message: any) => {
      const settings = await systemSettingsRegistry.getSettings()
      const sec = settings.emailSenderSettings?.securityIdentity

      if (!sec?.fromName || !sec?.fromEmail || !sec?.replyTo) {
        throw new Error(
          '[PayloadAuthEmailAdapter] Security sender identity (fromName, fromEmail, replyTo) is not configured in SystemSettings SSOT. Auth email dispatch blocked.',
        )
      }

      const fromHeader = `"${sec.fromName}" <${sec.fromEmail}>`
      const replyTo = sec.replyTo

      return emailNotificationAdapter.sendDirect({
        from: fromHeader,
        to: message.to,
        replyTo,
        subject: message.subject,
        html: message.html,
        text: message.text,
      })
    },
  }),
  onInit: async (payload) => {
    const { createPureDomainServices } = await import('./domains/factory')
    const { bootstrapApplication } = await import('./domains/bootstrap')
    const container = createPureDomainServices(payload)
    await bootstrapApplication(container)
  },
  plugins: [],
})
