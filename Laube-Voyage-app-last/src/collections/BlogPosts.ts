import type { CollectionConfig } from 'payload'
import { extractExcerpt, formatSlug } from '../utilities/hooks'
import { revalidateCollection } from '../utilities/revalidate'

export const BlogPosts: CollectionConfig = {
  slug: 'blog-posts',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['featuredImage', 'title', 'status', 'author', 'quickActions'],
    listSearchableFields: ['title', 'excerpt'],
    group: 'Collections',
  },
  hooks: {
    beforeChange: [formatSlug('title'), extractExcerpt('content')],
    afterChange: [() => revalidateCollection('blog')],
    afterDelete: [() => revalidateCollection('blog')],
  },
  access: {
    read: () => true, // Public access for published posts
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        position: 'sidebar',
        hidden: true,
      },
    },
    {
      name: 'excerpt',
      type: 'textarea',
      admin: {
        description: 'Short summary shown on blog listing',
      },
    },
    {
      name: 'featuredImage',
      type: 'upload',
      relationTo: 'media',
      admin: {
        components: {
          Cell: '@/components/payload/Cells/ThumbnailCell',
        },
      },
    },
    {
      name: 'content',
      type: 'richText',
    },
    {
      name: 'author',
      type: 'relationship',
      relationTo: 'users',
    },
    {
      name: 'categories',
      type: 'select',
      hasMany: true,
      options: [
        { label: 'Travel Tips', value: 'travel-tips' },
        { label: 'Destinations', value: 'destinations' },
        { label: 'Culture', value: 'culture' },
        { label: 'Food & Dining', value: 'food-dining' },
        { label: 'Adventure', value: 'adventure' },
        { label: 'Luxury', value: 'luxury' },
      ],
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'draft',
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Published', value: 'published' },
      ],
      admin: {
        position: 'sidebar',
        components: {
          Cell: '@/components/payload/Cells/BadgeCell',
        },
      },
    },
    {
      name: 'publishedAt',
      type: 'date',
      admin: {
        position: 'sidebar',
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
    },
    {
      name: 'quickActions',
      type: 'ui',
      admin: {
        components: {
          Cell: '@/components/payload/Cells/ActionCell',
        },
      },
    },
  ],
}
