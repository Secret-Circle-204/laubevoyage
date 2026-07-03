import { BeforeSync, DocToSync } from '@payloadcms/plugin-search/types'

export const beforeSyncWithSearch: BeforeSync = async ({ req: _req, originalDoc, searchDoc }) => {
  const {
    doc: { relationTo: _collection },
  } = searchDoc

  const { slug, _id, categories, title, meta } = originalDoc

  const modifiedDoc: DocToSync = {
    ...searchDoc,
    slug,
    meta: {
      ...meta,
      title: meta?.title || title,
      image: meta?.image?.id || meta?.image,
      description: meta?.description,
    },
    categories: [],
  }

  if (categories && Array.isArray(categories) && categories.length > 0) {
    modifiedDoc.categories = categories.map((category: string) => {
      // Use the category value as both ID and title for search indexing
      // Capitalize for better display in search results if needed
      const displayTitle = category
        .split('-')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')

      return {
        relationTo: 'categories', // Kept for schema compatibility if referenced elsewhere
        categoryID: category,
        title: displayTitle,
      }
    })
  }

  return modifiedDoc
}
