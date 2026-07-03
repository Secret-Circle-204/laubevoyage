import { CollectionConfig, PayloadRequest, Where } from 'payload'

export const Reviews: CollectionConfig = {
  slug: 'reviews',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['user', 'excursion', 'rating', 'status', 'createdAt'],
    listSearchableFields: ['comment'],
    group: 'Management',
  },
  access: {
    read: () => true, // Public can read approved reviews
    create: ({ req: { user } }) => Boolean(user), // Only logged-in users can create
    update: ({ req: { user } }) => user?.role === 'admin',
    delete: ({ req: { user } }) => user?.role === 'admin',
  },
  hooks: {
    beforeValidate: [
      async ({ data, req, operation }) => {
        if (operation === 'create' && data) {
          // Verify user is logged in
          if (!req.user) {
            throw new Error('Please log in to submit a review')
          }

          // Automatically set user to current logged-in user
          data.user = req.user.id

          // Validate that the user hasn't already reviewed this excursion
          const existing = await req.payload.find({
            collection: 'reviews',
            where: {
              and: [
                { user: { equals: req.user.id } },
                { excursion: { equals: data.excursion } },
              ],
            },
          })

          if (existing.totalDocs > 0) {
            throw new Error('You have already reviewed this excursion')
          }

          // Ensure status is pending initially
          data.status = 'pending'
        }
        return data
      },
    ],
  },
  endpoints: [
    {
      path: '/stats',
      method: 'get',
      handler: async (req: PayloadRequest) => {
        try {
          const url = new URL(req.url || '', 'http://localhost')
          const excursionId = url.searchParams.get('excursion')

          const query: Where = {
            status: { equals: 'approved' },
          }

          if (excursionId) {
            query.excursion = { equals: excursionId }
          }

          const reviews = await req.payload.find({
            collection: 'reviews',
            where: query,
            sort: '-createdAt',
            depth: 1, // Include user info
          })

          // Calculate stats
          const ratings = reviews.docs.map((r) => r.rating)
          const averageRating =
            ratings.length > 0
              ? ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length
              : 0

          const ratingDistribution: { [key: number]: number } = {}
          ratings.forEach((r: number) => {
            ratingDistribution[r] = (ratingDistribution[r] || 0) + 1
          })

          return Response.json({
            reviews: reviews.docs,
            totalReviews: reviews.totalDocs,
            averageRating,
            ratingDistribution,
          })
        } catch (error: unknown) {
          console.error('Reviews stats endpoint error:', error)
          const errorMessage =
            error instanceof Error ? error.message : 'Failed to fetch reviews statistics'
          return Response.json({ error: errorMessage }, { status: 500 })
        }
      },
    },
  ],
  fields: [
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'excursion',
      type: 'relationship',
      relationTo: 'excursions',
      required: true,
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'rating',
      type: 'number',
      required: true,
      min: 1,
      max: 5,
      admin: {
        description: '1-5 star rating',
      },
    },
    {
      name: 'title',
      type: 'text',
      required: true,
      admin: {
        placeholder: 'Summarize your experience',
      },
    },
    {
      name: 'comment',
      type: 'textarea',
      required: true,
      admin: {
        placeholder: 'Share details of your experience...',
      },
    },
    {
      name: 'tripDate',
      type: 'date',
      admin: {
        description: 'When did you take this excursion?',
        date: {
          pickerAppearance: 'dayOnly',
        },
      },
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'pending',
      options: [
        { label: 'Pending Review', value: 'pending' },
        { label: 'Approved', value: 'approved' },
        { label: 'Rejected', value: 'rejected' },
      ],
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'adminResponse',
      type: 'textarea',
      admin: {
        position: 'sidebar',
        description: "Official response from L'Aube Voyage",
      },
    },
  ],
}
