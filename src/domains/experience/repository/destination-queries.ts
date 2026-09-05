import type { Payload, PayloadRequest } from 'payload'
import type { City, Country } from '@/payload-types'
import type { RequestContext } from '@/types'
import { mapContextToReq } from './repository-context'

/**
 * Resolve authoritative destination IANA timezone for a given city ID.
 * Traverses City ──► Country.timezone without fallbacks.
 */
export async function findTimezoneByCityId(
  payload: Payload,
  cityId: number,
  context?: RequestContext | PayloadRequest,
): Promise<string> {
  if (!cityId || isNaN(cityId)) {
    throw new Error(
      `[ExperienceRepository] findTimezoneByCityId: cityId is required and must be a valid number.`,
    )
  }

  const req = mapContextToReq(context)
  let cityDoc: City | null = null

  if (typeof payload.findByID === 'function') {
    cityDoc = (await payload.findByID({
      collection: 'cities',
      id: cityId,
      depth: 1,
      req,
    })) as City | null
  } else if (typeof payload.find === 'function') {
    const res = await payload.find({
      collection: 'cities',
      where: { id: { equals: cityId } },
      depth: 1,
      req,
    })
    cityDoc = (res?.docs?.[0] as City) || null
  }

  if (!cityDoc) {
    throw new Error(`[ExperienceRepository] City #${cityId} not found in database.`)
  }

  let countryObj: Country | null = null
  if (typeof cityDoc.country === 'object' && cityDoc.country !== null) {
    countryObj = cityDoc.country as Country
  } else if (typeof cityDoc.country === 'number') {
    if (typeof payload.findByID === 'function') {
      countryObj = (await payload.findByID({
        collection: 'countries',
        id: cityDoc.country,
        depth: 0,
        req,
      })) as Country | null
    } else if (typeof payload.find === 'function') {
      const res = await payload.find({
        collection: 'countries',
        where: { id: { equals: cityDoc.country } },
        depth: 0,
        req,
      })
      countryObj = (res?.docs?.[0] as Country) || null
    }
  }

  const timezone = countryObj?.timezone

  if (!timezone || typeof timezone !== 'string' || timezone.trim().length === 0) {
    throw new Error(
      `[ExperienceRepository] Destination country for City #${cityId} (${cityDoc.name || 'unnamed'}) is missing authoritative IANA timezone.`,
    )
  }

  return timezone
}
