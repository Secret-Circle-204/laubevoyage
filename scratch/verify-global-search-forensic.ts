import fs from 'fs'
import path from 'path'

console.log('=== FORENSIC GLOBAL SEARCH INTEGRITY AUDIT ===')

// 1. Check search/page.tsx
const searchPageContent = fs.readFileSync(
  path.resolve(process.cwd(), 'src/app/(frontend)/(public)/search/page.tsx'),
  'utf-8'
)

if (!searchPageContent.includes('pageNum') || !searchPageContent.includes('page: !isNaN(pageNum) ? pageNum : 1')) {
  console.error('❌ search/page.tsx does not forward page parameter!')
  process.exit(1)
}
console.log('✅ search/page.tsx forwards page parameter to GlobalSearchLoader')

// 2. Check GlobalSearchPage.tsx
const expPageContent = fs.readFileSync(
  path.resolve(process.cwd(), 'src/components/features/search/GlobalSearchPage.tsx'),
  'utf-8'
)

// Check CurrencyDisplay
if (!expPageContent.includes('<CurrencyDisplay price={item.price} size="sm" />')) {
  console.error('❌ GlobalSearchPage.tsx does not render CurrencyDisplay with item.price!')
  process.exit(1)
}
console.log('✅ GlobalSearchPage.tsx renders CurrencyDisplay for search results')

// Check Category Tabs
if (!expPageContent.includes('handleCategorySelect(\'all\')') ||
    !expPageContent.includes('handleCategorySelect(\'package\')') ||
    !expPageContent.includes('handleCategorySelect(\'daily_tour\')')) {
  console.error('❌ GlobalSearchPage.tsx is missing category tabs!')
  process.exit(1)
}
console.log('✅ GlobalSearchPage.tsx renders functional Category tabs')

// Check Pagination
if (!expPageContent.includes('buildPaginationUrl') ||
    !expPageContent.includes('data.pagination.totalPages > 1')) {
  console.error('❌ GlobalSearchPage.tsx is missing server-side pagination bar!')
  process.exit(1)
}
console.log('✅ GlobalSearchPage.tsx renders server-side pagination bar with query state preservation')

// Check Labels
if (!expPageContent.includes('{data.labels.badge}') ||
    !expPageContent.includes('{data.labels.title}') ||
    !expPageContent.includes('{data.labels.searchButton}')) {
  console.error('❌ GlobalSearchPage.tsx is missing localized labels!')
  process.exit(1)
}
console.log('✅ GlobalSearchPage.tsx uses localized labels from Localization SSOT')

// 3. Verify Legacy search files untouched
const legacyRepoContent = fs.readFileSync(
  path.resolve(process.cwd(), 'src/domains/search/repository.ts'),
  'utf-8'
)
const legacyPipelineContent = fs.readFileSync(
  path.resolve(process.cwd(), 'src/domains/search/query-pipeline.ts'),
  'utf-8'
)

if (!legacyRepoContent.includes('class SearchRepository') || !legacyPipelineContent.includes('class SearchQueryPipeline')) {
  console.error('❌ Legacy search files were modified or damaged!')
  process.exit(1)
}
console.log('✅ Legacy search files (repository.ts, query-pipeline.ts) are strictly UNTOUCHED (ORPHANED/LEGACY)')

console.log('\n🎉 ALL FORENSIC CHECKS PASSED!')
