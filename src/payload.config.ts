import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'
import { nodemailerAdapter } from '@payloadcms/email-nodemailer'

import { Users } from './collections/Users'
import { Customers } from './collections/Customers'
import { Media } from './collections/Media'
import { Countries } from './collections/Countries'
import { Cities } from './collections/Cities'
import { Experiences } from './collections/Experiences'
import { Bookings } from './collections/Bookings'
import { PointLedger } from './collections/PointLedger'
import { ExchangeRates } from './collections/ExchangeRates'
import { Currencies } from './collections/Currencies'
import { TranslationCache } from './collections/TranslationCache'
import { AdminAuditLogs } from './collections/AdminAuditLogs'
import { CustomerAddresses } from './collections/CustomerAddresses'
import { CustomerDeviceSessions } from './collections/CustomerDeviceSessions'
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
    Experiences,
    Bookings,
    PointLedger,
    ExchangeRates,
    Currencies,
    TranslationCache,
    AdminAuditLogs,
    CustomerAddresses,
    CustomerDeviceSessions,
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
    push: process.env.NODE_ENV !== 'production' && process.env.VITEST !== 'true',
    migrationDir: path.resolve(dirname, 'migrations'),
  }),
  sharp,
  email: nodemailerAdapter({
    defaultFromAddress: process.env.FROM_EMAIL!,
    defaultFromName: process.env.FROM_NAME!,
    transportOptions: {
      host: process.env.SMTP_HOST!,
      port: Number(process.env.SMTP_PORT!),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER!,
        pass: process.env.SMTP_PASSWORD!,
      },
    },
  }),
  plugins: [],
})
