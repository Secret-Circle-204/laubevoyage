import path from 'path'
import fs from 'fs'
import type { Payload } from 'payload'
import {
  DESTINATION_MEDIA_MANIFEST,
  EXPERIENCE_MEDIA_MANIFEST,
  type ImageProvenanceRecord,
} from './manifests/media-manifest'

export interface SeededMediaResult {
  assetMap: Record<string, number>
  totalProcessed: number
  totalDownloaded: number
  totalIngested: number
  totalReused: number
}

/**
 * Downloads binary image from high-res URL to local storage if not already cached.
 */
async function ensureLocalAsset(asset: ImageProvenanceRecord, stagingDir: string): Promise<string> {
  const localFilePath = path.resolve(process.cwd(), asset.localRelativePath)
  const localDir = path.dirname(localFilePath)

  if (!fs.existsSync(localDir)) {
    fs.mkdirSync(localDir, { recursive: true })
  }

  if (fs.existsSync(localFilePath) && fs.statSync(localFilePath).size > 1024) {
    return localFilePath
  }

  console.log(`      ⬇️ Downloading [${asset.assetKey}] from ${asset.provider} (${asset.photographer})...`)
  const response = await fetch(asset.downloadUrl, {
    headers: {
      'User-Agent': 'LaubeVoyage-Seed-Engine/1.0 (Commercial Travel Architecture)',
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to download asset ${asset.assetKey} (${response.status} ${response.statusText}) from ${asset.downloadUrl}`)
  }

  const arrayBuffer = await response.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  if (buffer.length < 1024) {
    throw new Error(`Downloaded asset ${asset.assetKey} is corrupt or too small (${buffer.length} bytes)`)
  }

  fs.writeFileSync(localFilePath, buffer)
  console.log(`      💾 Cached local asset: ${asset.filename} (${(buffer.length / 1024).toFixed(1)} KB)`)
  return localFilePath
}

/**
 * Ingests a media manifest into the Payload Media collection deterministically.
 */
async function ingestMediaManifest(
  payload: Payload,
  manifest: ImageProvenanceRecord[],
  stagingDir: string,
  label: string,
): Promise<SeededMediaResult> {
  console.log(`🖼️ [Seed] Ingesting & Resolving ${label} (${manifest.length} Verified Assets)...`)

  if (!fs.existsSync(stagingDir)) {
    fs.mkdirSync(stagingDir, { recursive: true })
  }

  const assetMap: Record<string, number> = {}
  let totalDownloaded = 0
  let totalIngested = 0
  let totalReused = 0

  for (const asset of manifest) {
    const hadLocalFile = fs.existsSync(path.resolve(process.cwd(), asset.localRelativePath))
    const localFilePath = await ensureLocalAsset(asset, stagingDir)
    if (!hadLocalFile) totalDownloaded++

    const existingMedia = await payload.find({
      collection: 'media',
      where: {
        filename: { equals: asset.filename },
      },
      limit: 1,
    })

    let mediaDoc: any = existingMedia.docs?.[0]

    if (mediaDoc) {
      if (!mediaDoc.alt || typeof mediaDoc.alt !== 'string' || mediaDoc.alt.trim().length === 0) {
        await payload.update({
          collection: 'media',
          id: mediaDoc.id,
          data: { alt: asset.alt },
        })
      }
      assetMap[asset.assetKey] = mediaDoc.id
      totalReused++
    } else {
      const created = await payload.create({
        collection: 'media',
        filePath: localFilePath,
        data: {
          alt: asset.alt,
        },
      })

      if (!created || !created.id) {
        throw new Error(`Payload Media creation failed for assetKey: ${asset.assetKey}`)
      }

      mediaDoc = created
      assetMap[asset.assetKey] = created.id
      totalIngested++
      console.log(`      ✅ Ingested Media #${created.id} [${asset.assetKey}] (${created.filename}, ${created.width}x${created.height})`)
    }
  }

  console.log(`   ✅ ${label} Complete: ${Object.keys(assetMap).length}/${manifest.length} resolved (${totalIngested} newly ingested, ${totalReused} reused from DB, ${totalDownloaded} downloaded).`)

  return {
    assetMap,
    totalProcessed: Object.keys(assetMap).length,
    totalDownloaded,
    totalIngested,
    totalReused,
  }
}

/**
 * Master Enterprise Media Seeder for Countries and Cities Hero Assets (52 Assets).
 */
export async function seedDestinationMedia(payload: Payload): Promise<SeededMediaResult> {
  const stagingDir = path.resolve(process.cwd(), 'public/media-assets/destinations')
  return ingestMediaManifest(payload, DESTINATION_MEDIA_MANIFEST, stagingDir, 'Destination Hero Media')
}

/**
 * Master Enterprise Media Seeder for Experiences Hero Assets (11 Assets).
 */
export async function seedExperienceMedia(payload: Payload): Promise<SeededMediaResult> {
  const stagingDir = path.resolve(process.cwd(), 'public/media-assets/experiences')
  return ingestMediaManifest(payload, EXPERIENCE_MEDIA_MANIFEST, stagingDir, 'Experience Hero Media')
}

