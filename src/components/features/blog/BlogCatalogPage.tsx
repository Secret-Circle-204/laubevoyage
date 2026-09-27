'use client'

import React from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui'
import { BlogCard } from './BlogCard'
import type { BlogCatalogDTO } from '@/application/blog/dto'

export function BlogCatalogPage({ data }: { data: BlogCatalogDTO }) {
  return (
    <div className="py-16 bg-slate-50 dark:bg-slate-950 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <Badge variant="secondary" className="mb-3">
            Insights & Inspiration
          </Badge>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            L&apos;Aube Travel Journal
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-3 text-base sm:text-lg">
            Expert insights, cultural perspectives, and luxury journey stories tailored for discerning travelers.
          </p>
        </div>

        {/* Articles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {data.articles.map((article) => (
            <BlogCard key={article.id} article={article} />
          ))}
        </div>

        {/* Server-Side Pagination Bar */}
        {data.pagination && data.pagination.totalPages > 1 && (
          <div className="flex items-center justify-between pt-12 mt-12 border-t border-slate-200 dark:border-slate-800">
            <span className="text-sm font-medium text-slate-500">
              Page {data.pagination.page} of {data.pagination.totalPages} ({data.pagination.totalItems} total)
            </span>

            <div className="flex items-center gap-3">
              {data.pagination.hasPrevPage ? (
                <Link
                  href={`/blog?page=${data.pagination.page - 1}`}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  ← Previous
                </Link>
              ) : (
                <span className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-400 cursor-not-allowed">
                  ← Previous
                </span>
              )}

              {data.pagination.hasNextPage ? (
                <Link
                  href={`/blog?page=${data.pagination.page + 1}`}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Next →
                </Link>
              ) : (
                <span className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-400 cursor-not-allowed">
                  Next →
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
