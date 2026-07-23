'use client'

import React from 'react'
import Link from 'next/link'
import { Card, Badge } from '@/components/ui'
import type { BlogArticleDTO } from '@/application/blog/dto'

export function BlogCard({ article }: { article: BlogArticleDTO }) {
  return (
    <Link href={`/blog/${article.slug}`} className="group">
      <Card variant="interactive" padding="none" className="flex flex-col h-full">
        <div className="relative h-56 w-full bg-slate-200 overflow-hidden">
          <div
            className="absolute inset-0 bg-cover bg-center group-hover:scale-110 transition-transform duration-700"
            style={{ backgroundImage: `url(${article.featuredImageUrl})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent" />

          <div className="absolute top-4 left-4">
            <Badge variant="glass" size="sm">
              {article.category}
            </Badge>
          </div>
        </div>

        <div className="p-6 flex flex-col justify-between flex-grow gap-4">
          <div>
            <div className="flex items-center gap-3 text-xs text-slate-400 mb-2">
              <span>{article.publishedAt}</span>
              <span>•</span>
              <span>{article.readTimeMinutes} min read</span>
            </div>

            <h3 className="text-xl font-bold text-slate-900 dark:text-white group-hover:text-[#00aeef] transition-colors line-clamp-2">
              {article.title}
            </h3>

            <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 line-clamp-3 leading-relaxed">
              {article.summary}
            </p>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              By {article.authorName}
            </span>
            <span className="text-xs font-bold text-[#00aeef] group-hover:translate-x-1 transition-transform">
              Read Article →
            </span>
          </div>
        </div>
      </Card>
    </Link>
  )
}
