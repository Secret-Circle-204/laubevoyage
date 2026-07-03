import { GlobalConfig } from 'payload'
import { publicReadAdminWrite } from '../access'
import { revalidateCollection } from '../utilities/revalidate'

export const CompanySettings: GlobalConfig = {
  slug: 'company-settings',
  access: publicReadAdminWrite,
  admin: {
    group: 'Settings',
    description:
      'Manage core company details, branding, contact info, and social links across the platform.',
  },
  hooks: {
    afterChange: [() => revalidateCollection('company')],
  },
  fields: [
    {
      type: 'tabs',
      admin: { className: 'main-column' },
      tabs: [
        {
          label: 'Brand Identity',
          description: 'Basic information and branding for the application.',
          fields: [
            {
              type: 'row',
              fields: [
                {
                  name: 'companyName',
                  type: 'text',
                  required: true,
                  defaultValue: "L'Aube Voyage",
                  admin: {
                    width: '50%',
                    description: 'This name appears in emails, footprints, and headers.',
                    components: { Field: '/components/payload/Fields/TextField' },
                  },
                },
                {
                  name: 'slogan',
                  type: 'text',
                  admin: {
                    width: '50%',
                    description: 'A short catchy phrase (e.g., "Your ultimate travel partner").',
                    placeholder: 'Discover the world with us...',
                    components: { Field: '/components/payload/Fields/TextField' },
                  },
                },
              ],
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'logo',
                  type: 'upload',
                  relationTo: 'media',
                  admin: {
                    width: '100%',
                    description: 'Upload the primary brand logo (SVG or clear PNG recommended).',
                  },
                },
              ],
            },
            {
              name: 'footerAboutText',
              label: 'Footer About Text',
              type: 'textarea',
              admin: {
                width: '100%',
                rows: 3,
                description:
                  'A brief 1-2 sentence description about the company for the website footer.',
                components: { Field: '/components/payload/Fields/TextareaField' },
              },
            },
          ],
        },
        {
          label: 'Contact Information',
          description: 'Used for customer support, booking confirmations, and footer display.',
          fields: [
            {
              type: 'row',
              fields: [
                {
                  name: 'email',
                  type: 'email',
                  required: true,
                  admin: {
                    width: '33.33%',
                    placeholder: 'contact@laubevoyage.com',
                    components: { Field: '/components/payload/Fields/TextField' },
                  },
                },
                {
                  name: 'phone',
                  type: 'text',
                  required: true,
                  admin: {
                    width: '33.33%',
                    placeholder: '+20 123 456 7890',
                    components: { Field: '/components/payload/Fields/TextField' },
                  },
                },
                {
                  name: 'whatsapp',
                  label: 'WhatsApp Number',
                  type: 'text',
                  admin: {
                    width: '33.33%',
                    placeholder: '+20 100 000 0000',
                    components: { Field: '/components/payload/Fields/TextField' },
                  },
                },
              ],
            },
            {
              name: 'address',
              type: 'textarea',
              defaultValue: '6th, El-Margoushy street, 6th District, Nasr City, Cairo, Egypt',
              admin: {
                description: 'The physical address displayed on the website contact page.',
                rows: 2,
                components: { Field: '/components/payload/Fields/TextareaField' },
              },
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'googleMapsLink',
                  label: 'Google Maps Link',
                  type: 'text',
                  admin: {
                    width: '50%',
                    placeholder: 'https://maps.google.com/...',
                    components: { Field: '/components/payload/Fields/TextField' },
                  },
                },
                {
                  name: 'workingHours',
                  label: 'Working Hours',
                  type: 'text',
                  admin: {
                    width: '50%',
                    placeholder: 'Mon-Sun: 9:00 AM - 6:00 PM',
                    components: { Field: '/components/payload/Fields/TextField' },
                  },
                },
              ],
            },
          ],
        },
        {
          label: 'Social Media',
          description: 'Links to your active social networks.',
          fields: [
            {
              type: 'row',
              fields: [
                {
                  name: 'instagram',
                  type: 'text',
                  admin: {
                    width: '50%',
                    placeholder: 'https://instagram.com/...',
                    components: { Field: '/components/payload/Fields/TextField' },
                  },
                },
                {
                  name: 'facebook',
                  type: 'text',
                  admin: {
                    width: '50%',
                    placeholder: 'https://facebook.com/...',
                    components: { Field: '/components/payload/Fields/TextField' },
                  },
                },
              ],
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'x',
                  label: 'X (Twitter)',
                  type: 'text',
                  admin: {
                    width: '50%',
                    placeholder: 'https://x.com/...',
                    components: { Field: '/components/payload/Fields/TextField' },
                  },
                },
                {
                  name: 'linkedin',
                  type: 'text',
                  admin: {
                    width: '50%',
                    placeholder: 'https://linkedin.com/...',
                    components: { Field: '/components/payload/Fields/TextField' },
                  },
                },
              ],
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'youtube',
                  label: 'YouTube',
                  type: 'text',
                  admin: {
                    width: '50%',
                    placeholder: 'https://youtube.com/...',
                    components: { Field: '/components/payload/Fields/TextField' },
                  },
                },
                {
                  name: 'tiktok',
                  label: 'TikTok',
                  type: 'text',
                  admin: {
                    width: '50%',
                    placeholder: 'https://tiktok.com/@...',
                    components: { Field: '/components/payload/Fields/TextField' },
                  },
                },
              ],
            },
          ],
        },
        {
          label: 'Legal & Business',
          description: 'Corporate registration and tax details.',
          fields: [
            {
              type: 'row',
              fields: [
                {
                  name: 'commercialRegistration',
                  label: 'Commercial Registration (CR)',
                  type: 'text',
                  admin: {
                    width: '50%',
                    description: 'Optional business registration number.',
                    components: { Field: '/components/payload/Fields/TextField' },
                  },
                },
                {
                  name: 'taxId',
                  label: 'Tax / VAT ID',
                  type: 'text',
                  admin: {
                    width: '50%',
                    description: 'Optional tax identification number.',
                    components: { Field: '/components/payload/Fields/TextField' },
                  },
                },
              ],
            },
          ],
        },
        {
          label: 'SMTP Settings',
          description: 'Configure mail servers and passwords for automated communications.',
          fields: [
            {
              type: 'row',
              fields: [
                {
                  name: 'smtpHost',
                  label: 'SMTP Hostname',
                  type: 'text',
                  required: true,
                  defaultValue: 'mail.laubevoyage.com',
                  admin: {
                    width: '33.33%',
                    description: 'SMTP host (e.g. mail.laubevoyage.com)',
                    components: { Field: '/components/payload/Fields/TextField' },
                  },
                },
                {
                  name: 'smtpPort',
                  label: 'SMTP Port',
                  type: 'number',
                  required: true,
                  defaultValue: 465,
                  admin: {
                    width: '33.33%',
                    description: 'SMTP port (e.g. 465 or 587)',
                  },
                },
                {
                  name: 'smtpSecure',
                  label: 'SSL/TLS (Secure Connection)',
                  type: 'checkbox',
                  defaultValue: true,
                  admin: {
                    width: '33.33%',
                    description: 'Checked for port 465, unchecked for 587',
                  },
                },
              ],
            },
            {
              type: 'group',
              name: 'contactMail',
              label: 'General Contact Account (contact@laubevoyage.com)',
              fields: [
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'email',
                      label: 'Username / Email Address',
                      type: 'text',
                      required: true,
                      defaultValue: 'contact@laubevoyage.com',
                      admin: {
                        width: '50%',
                        components: { Field: '/components/payload/Fields/TextField' },
                      },
                    },
                    {
                      name: 'password',
                      label: 'Password',
                      type: 'text',
                      required: true,
                      defaultValue: 'C8090@laubevoyage',
                      admin: {
                        width: '50%',
                        components: { Field: '/components/payload/Fields/PasswordField' },
                      },
                      access: {
                        read: () => false,
                      },
                    },
                  ],
                },
              ],
            },
            {
              type: 'group',
              name: 'reservationMail',
              label: 'Reservations Account (reservation@laubevoyage.com)',
              fields: [
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'email',
                      label: 'Username / Email Address',
                      type: 'text',
                      required: true,
                      defaultValue: 'reservation@laubevoyage.com',
                      admin: {
                        width: '50%',
                        components: { Field: '/components/payload/Fields/TextField' },
                      },
                    },
                    {
                      name: 'password',
                      label: 'Password',
                      type: 'text',
                      required: true,
                      defaultValue: 'R8090@laubevoyage',
                      admin: {
                        width: '50%',
                        components: { Field: '/components/payload/Fields/PasswordField' },
                      },
                      access: {
                        read: () => false,
                      },
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
}
