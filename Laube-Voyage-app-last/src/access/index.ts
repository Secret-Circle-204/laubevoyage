import type { Access, FieldAccess } from 'payload'

/**
 * ============================================================
 *  🔐 CENTRALIZED ACCESS CONTROL — L'Aube Voyage
 * ============================================================
 *
 *  HOW IT WORKS:
 *  - Every collection & global uses these shared functions
 *  - They check the user's `role` from the JWT token
 *  - `saveToJWT: true` on the role field means no DB lookup needed
 *
 *  RULES:
 *  ┌──────────────────────────────────────────────────────────┐
 *  │  isAdmin       → Only admin users                       │
 *  │  isAdminField   → Field-level: only admin can edit      │
 *  │  anyone         → No restriction (public)               │
 *  │  authenticated  → Any logged-in user                    │
 *  │  adminOnly      → All CRUD restricted to admin          │
 *  │  publicReadAdminWrite → Public reads, admin manages     │
 *  │  adminOrSelf    → Admin sees all, user sees own data    │
 *  └──────────────────────────────────────────────────────────┘
 *
 *  ⚠️ WARNING: Do NOT modify these without understanding the impact.
 *  Changing `isAdmin` affects admin panel access globally.
 */

// ─── Primitive Checks ────────────────────────────────────────

/** Returns true only for users with role === 'admin' */
export const isAdmin: Access = ({ req: { user } }) => {
  return user?.role === 'admin'
}

/** Field-level: only admins can write this field */
export const isAdminField: FieldAccess = ({ req: { user } }) => {
  return Boolean(user?.role === 'admin')
}

/** Returns true for any request — fully public */
export const anyone: Access = () => true

/** Returns true only for logged-in users (any role) */
export const authenticated: Access = ({ req: { user } }) => Boolean(user)

// ─── Collection Access Patterns ─────────────────────────────

/**
 * PUBLIC READ, ADMIN WRITE
 * Used for: Packages, Excursions, Destinations, Hotels, Cities, BlogPosts
 *
 * - Anyone can READ (for the website frontend)
 * - Only Admin can CREATE / UPDATE / DELETE
 */
export const publicReadAdminWrite = {
  read: anyone,
  create: isAdmin,
  update: isAdmin,
  delete: isAdmin,
}

/**
 * ADMIN ONLY — all operations
 * Used for: LoyaltyPoints, ContactInquiries, Bookings, Emails
 *
 * - Only Admin can READ / CREATE / UPDATE / DELETE
 * - REST API will reject non-admin requests
 */
export const adminOnly = {
  read: isAdmin,
  create: isAdmin,
  update: isAdmin,
  delete: isAdmin,
}

/**
 * ADMIN OR SELF — row-level security
 * Used for: Users
 *
 * - Admin sees all rows
 * - Regular users see only their own row
 */
export const adminOrSelf: Access = ({ req: { user } }) => {
  if (user?.role === 'admin') return true
  if (!user) return false
  return { id: { equals: user.id } }
}

/**
 * ADMIN OR USER FIELD — row-level security
 * Used for: Bookings, LoyaltyPoints
 *
 * - Admin sees all rows
 * - Regular users see only rows where the `user` field matches their ID
 */
export const adminOrUserField: Access = ({ req: { user } }) => {
  if (user?.role === 'admin') return true
  if (!user) return false
  return { user: { equals: user.id } }
}
