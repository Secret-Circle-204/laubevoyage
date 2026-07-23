import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

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
import { Translations } from './collections/Translations'
import { Coupons } from './collections/Coupons'

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
    Translations,
    Coupons,
  ],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL || '',
    },
  }),
  sharp,
  plugins: [],
  localization: {
    locales: ['en', 'ar', 'fr'],
    defaultLocale: 'en',
    fallback: true,
  },
})

