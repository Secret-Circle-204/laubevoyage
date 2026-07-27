import type { CollectionBeforeChangeHook } from 'payload'

/**
 * beforeChange hook for Experiences collection.
 *
 * Extracts the virtual `_slotsPayload` field from the incoming form data
 * and stores it in `req.context` so it can be consumed by the `afterChange`
 * hook (`syncDepartureSlots`).
 *
 * Because `_slotsPayload` is declared with `virtual: true`, Payload does not
 * create a database column for it. We still explicitly delete it from `data`
 * as a safety measure to guarantee it never reaches the DB layer.
 *
 * This hook is part of Payload's standard save pipeline — validation, access
 * control, drafts, and versioning all run normally before and after it.
 */
export const extractSlotsPayload: CollectionBeforeChangeHook = ({ data, req }) => {
  if (data?._slotsPayload) {
    // Transfer slot instructions to request context (lives only for this request)
    req.context.pendingSlots = data._slotsPayload

    // Remove from data so it never reaches the database write
    delete data._slotsPayload
  }

  return data
}
