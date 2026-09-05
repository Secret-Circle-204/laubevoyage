import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../payload.config'

/**
 * Administrative Script: Legacy Translation Cache Cleanup
 * 
 * Usage:
 *   pnpm tsx src/scripts/execute-legacy-translation-cleanup.ts            # Executes cleanup
 *   pnpm tsx src/scripts/execute-legacy-translation-cleanup.ts --dry-run  # Dry run (inspection only)
 */
async function run() {
  const isDryRun = process.argv.includes('--dry-run')
  const payload = await getPayload({ config })

  console.log('================================================================')
  console.log(`LEGACY TRANSLATION CACHE CLEANUP ${isDryRun ? '(DRY RUN MODE)' : '(EXECUTION MODE)'}`)
  console.log('================================================================\n')

  // 1. Audit current cache entries
  const beforeRes = await payload.find({
    collection: 'translation-cache',
    limit: 10000,
  })

  const beforeCounts: Record<string, number> = {}
  for (const doc of beforeRes.docs as any[]) {
    const p = doc.provider || 'unknown'
    beforeCounts[p] = (beforeCounts[p] || 0) + 1
  }

  console.log('--- Current Inventory in Database ---')
  console.log(`  • google:     ${beforeCounts['google'] || 0}`)
  console.log(`  • cloudflare: ${beforeCounts['cloudflare'] || 0}`)
  console.log(`  • azure:      ${beforeCounts['azure'] || 0}`)
  console.log(`  • seeder:     ${beforeCounts['seeder'] || 0}`)
  console.log(`  • TOTAL:      ${beforeRes.totalDocs}\n`)

  const legacyDocs = (beforeRes.docs as any[]).filter(
    (d) => d.provider === 'google' || d.provider === 'cloudflare'
  )

  if (legacyDocs.length === 0) {
    console.log('✅ Database is already clean. Zero legacy records found.')
    process.exit(0)
  }

  if (isDryRun) {
    console.log(`🔍 [DRY RUN] Found ${legacyDocs.length} legacy records eligible for deletion. Zero records were deleted.`)
    process.exit(0)
  }

  // 2. Perform Targeted Deletion
  console.log(`🧹 Deleting ${legacyDocs.length} legacy records (google/cloudflare)...`)
  let deletedCount = 0
  for (const doc of legacyDocs) {
    await payload.delete({
      collection: 'translation-cache',
      id: doc.id,
    })
    deletedCount++
  }
  console.log(`✅ Successfully deleted ${deletedCount} legacy records.\n`)

  // 3. Audit post-cleanup state
  const afterRes = await payload.find({
    collection: 'translation-cache',
    limit: 10000,
  })

  const afterCounts: Record<string, number> = {}
  for (const doc of afterRes.docs as any[]) {
    const p = doc.provider || 'unknown'
    afterCounts[p] = (afterCounts[p] || 0) + 1
  }

  console.log('--- Database Inventory After Cleanup ---')
  console.log(`  • google:     ${afterCounts['google'] || 0}`)
  console.log(`  • cloudflare: ${afterCounts['cloudflare'] || 0}`)
  console.log(`  • azure:      ${afterCounts['azure'] || 0}`)
  console.log(`  • seeder:     ${afterCounts['seeder'] || 0}`)
  console.log(`  • TOTAL:      ${afterRes.totalDocs}\n`)

  console.log('🎉 Cleanup complete. Fresh translations will naturally generate via Azure on demand.')
  process.exit(0)
}

run().catch((err) => {
  console.error('Error during cleanup execution:', err)
  process.exit(1)
})
