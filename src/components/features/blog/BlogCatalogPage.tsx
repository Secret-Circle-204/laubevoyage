'use client'

import React from 'react'
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
            Expert insights, Egyptologist perspectives, and luxury journey stories tailored for discerning travelers.
          </p>
        </div>

        {/* Articles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {data.articles.map((article) => (
            <BlogCard key={article.id} article={article} />
          ))}
        </div>
      </div>
    </div>
  )
}
