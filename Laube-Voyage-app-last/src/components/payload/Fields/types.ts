/**
 * Shared types for custom Payload CMS field components.
 *
 * These components receive a `field` prop from Payload's admin UI.
 * Rather than fighting with Payload's complex union types (ClientField,
 * FieldAffectingDataClient, etc.), we define a minimal interface that
 * describes ONLY the properties our custom components actually access.
 */

import type { DescriptionFunction, LabelFunction } from 'payload'

/**
 * Admin configuration shape passed to custom field components.
 * Matches the subset of AdminClient that our components use.
 */
export interface FieldAdminConfig {
  description?: string | Record<string, string> | DescriptionFunction
  placeholder?: string
  width?: string
  readOnly?: boolean
  [key: string]: unknown
}

/**
 * Minimal field configuration interface for custom Payload field components.
 * This is the subset of properties our custom wrappers actually access from
 * the `field` prop passed by Payload's admin UI.
 */
export interface FieldConfig {
  label?: string | LabelFunction | Record<string, string> | false
  required?: boolean
  admin?: FieldAdminConfig
  options?: { label: string; value: string }[]
  hasMany?: boolean
  maxLength?: number
  [key: string]: unknown
}
