import { GlobalConfig } from 'payload'
import { publicReadAdminWrite } from '../access'
import { revalidateCollection } from '../utilities/revalidate'

export const AboutPageConfig: GlobalConfig = {
  slug: 'about-page-config',
  label: 'About Page Config',
  access: publicReadAdminWrite,
  hooks: {
    afterChange: [() => revalidateCollection('company')],
  },
  fields: [
    {
      name: 'hero',
      type: 'group',
      admin: { className: 'main-column' },
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'title',
              type: 'text',
              required: true,
              defaultValue: 'Who We Are',
              admin: { width: '50%' },
            },
            {
              name: 'subtitle',
              type: 'text',
              required: true,
              defaultValue:
                'Crafting extraordinary journeys for the discerning traveler since 1996.',
              admin: { width: '50%' },
            },
          ],
        },
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
          required: true,
        },
      ],
    },
    {
      name: 'history',
      type: 'group',
      label: 'Company History',
      admin: { className: 'main-column' },
      fields: [
        {
          name: 'content',
          type: 'richText',
          required: true,
        },
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
        },
      ],
    },
    {
      name: 'philosophy',
      type: 'group',
      label: 'Our Philosophy',
      admin: { className: 'main-column' },
      fields: [
        {
          name: 'content',
          type: 'richText',
          required: true,
        },
        {
          name: 'characteristics',
          type: 'textarea',
          label: 'Core Characteristics',
          admin: {
            description:
              'Enter one characteristic per line (e.g. Integrity, Excellence, Innovation)',
            rows: 6,
          },
        },
      ],
    },
    {
      name: 'missionVision',
      type: 'group',
      label: 'Mission & Vision',
      admin: { className: 'main-column' },
      fields: [
        {
          name: 'mission',
          type: 'richText',
          label: 'Our Mission',
          admin: {
            description:
              'Mission: Through Travel, we connect people to new experiences in a safe and secured environment hiring the best calibers in Tourism to serve our customers in an optimum manner',
          },
        },
        {
          name: 'vision',
          type: 'richText',
          label: 'Our Vision',
          admin: {
            description: 'Vision: To create a community where everyone in able to travel',
          },
        },
      ],
    },
    {
      name: 'management',
      type: 'array',
      label: 'Management Structure',
      interfaceName: 'ManagementMember',
      labels: {
        singular: 'Member',
        plural: 'Members',
      },
      admin: {
        className: 'main-column',
        components: {
          Field: '@/components/payload/C_SectionDrawer#SectionDrawer',
          RowLabel: '@/components/payload/C_RowLabel#C_RowLabel',
        },
      },
      fields: [
        {
          name: 'name',
          type: 'text',
          required: true,
        },
        {
          name: 'position',
          type: 'text',
          required: true,
        },
        {
          name: 'bio',
          type: 'richText',
        },
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
        },
      ],
    },
    {
      name: 'accreditations',
      type: 'array',
      label: 'Legal Licenses & Certifications',
      labels: {
        singular: 'Accreditation',
        plural: 'Accreditations',
      },
      admin: { className: 'main-column' },
      fields: [
        {
          name: 'title',
          type: 'text',
          required: true,
        },
        {
          name: 'organization',
          type: 'text',
        },
        {
          name: 'logo',
          type: 'upload',
          relationTo: 'media',
        },
      ],
    },
    {
      name: 'specializedPrograms',
      type: 'group',
      label: 'Specialized Programs',
      admin: { className: 'main-column' },
      fields: [
        {
          name: 'cultural',
          type: 'group',
          label: 'Cultural Packages',
          fields: [
            { name: 'description', type: 'richText' },
            { name: 'image', type: 'upload', relationTo: 'media' },
          ],
        },
        {
          name: 'incentive',
          type: 'group',
          label: 'Incentive & Business Travel',
          fields: [
            { name: 'description', type: 'richText' },
            { name: 'image', type: 'upload', relationTo: 'media' },
          ],
        },
        {
          name: 'adventure',
          type: 'group',
          label: 'Adventure Packages',
          fields: [
            { name: 'description', type: 'richText' },
            { name: 'image', type: 'upload', relationTo: 'media' },
          ],
        },
      ],
    },
    {
      name: 'transport',
      type: 'group',
      label: 'Our Transport',
      admin: { className: 'main-column' },
      fields: [
        { name: 'content', type: 'richText' },
        { name: 'image', type: 'upload', relationTo: 'media' },
      ],
    },
  ],
}
