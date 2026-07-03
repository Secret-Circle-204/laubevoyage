import { postgresAdapter } from '@payloadcms/db-postgres'
import sharp from 'sharp'
import path from 'path'
import { buildConfig, PayloadRequest } from 'payload'
import { fileURLToPath } from 'url'
import { lexicalEditor, FixedToolbarFeature } from '@payloadcms/richtext-lexical'
import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { Packages } from './collections/Packages'
import { Bookings } from './collections/Bookings'
import { BlogPosts } from './collections/BlogPosts'

import { Excursions } from './collections/Excursions'
import { LoyaltyPoints } from './collections/LoyaltyPoints'
import { Emails } from './collections/Emails'
import { Destinations } from './collections/Destinations'
import { Hotels } from './collections/Hotels'
import { ContactInquiries } from './collections/ContactInquiries'
import { Reviews } from './collections/Reviews'
import { Cities } from './collections/Cities'

import { CompanySettings } from './globals/CompanySettings'
import { HomePage } from './globals/HomePage'
import { AboutPageConfig } from './globals/AboutPageConfig'
import { LoyaltySettings } from './globals/LoyaltySettings'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    components: {
      // Custom branded login page with background image and logo
      beforeLogin: ['@/components/payload/BeforeLogin#BeforeLogin'],
      // Welcome message on dashboard
      beforeDashboard: ['@/components/BeforeDashboard'],
      // Custom navigation with icons and brand colors
      Nav: '@/components/payload/Nav#Nav',
      // Custom graphics to bypass Payload 3 HMR buggy icons
      graphics: {
        Icon: '@/components/payload/graphics/Icon#Icon',
        Logo: '@/components/payload/graphics/Logo#Logo',
      },
    },
    importMap: {
      baseDir: path.resolve(dirname),
    },
    user: Users.slug,
    livePreview: {
      breakpoints: [
        {
          label: 'Mobile',
          name: 'mobile',
          width: 375,
          height: 667,
        },
        {
          label: 'Tablet',
          name: 'tablet',
          width: 768,
          height: 1024,
        },
        {
          label: 'Desktop',
          name: 'desktop',
          width: 1440,
          height: 900,
        },
      ],
    },
  },
  // This config helps us configure global or default features that the other editors can inherit
  editor: lexicalEditor({
    features: ({ defaultFeatures }) => {
      // Remove inline toolbar as we are using the fixed toolbar
      const filteredFeatures = defaultFeatures.filter((f) => f.key !== 'toolbarInline')
      return [...filteredFeatures, FixedToolbarFeature()]
    },
  }),
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URI,
      max: 10, // Maximum connections in pool (prevents exhaustion)
      idleTimeoutMillis: 30000, // Close idle connections after 30s
      connectionTimeoutMillis: 10000, // Fail fast if can't connect in 10s
    },
  }),
  collections: [
    Users,
    Media,
    Packages,
    Bookings,
    BlogPosts,
    Excursions,
    LoyaltyPoints,
    Emails,
    Destinations,
    Hotels,
    ContactInquiries,
    Reviews,
    Cities,
  ],
  cors: [process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'].filter(Boolean),
  globals: [CompanySettings, HomePage, AboutPageConfig, LoyaltySettings],
  secret: process.env.PAYLOAD_SECRET!,
  sharp,
  plugins: [
    // Add plugins here
  ],
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  jobs: {
    access: {
      run: ({ req }: { req: PayloadRequest }): boolean => {
        // Allow logged in users to execute this endpoint (default)
        if (req.user) return true

        // If there is no logged in user, then check
        // for the Vercel Cron secret to be present as an
        // Authorization header:
        const authHeader = req.headers.get('authorization')
        return authHeader === `Bearer ${process.env.CRON_SECRET}`
      },
    },
    tasks: [],
  },
})
