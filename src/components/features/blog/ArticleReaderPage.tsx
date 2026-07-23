'use client'

import React from 'react'
import Link from 'next/link'
import { Badge, Button } from '@/components/ui'
import type { BlogArticleDTO } from '@/application/blog/dto'

export function ArticleReaderPage({ article }: { article: BlogArticleDTO }) {
  return (
    <article className="py-16 bg-white dark:bg-slate-950 min-h-screen text-slate-900 dark:text-slate-100">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <Link href="/blog">
          <Button variant="ghost" size="sm" className="mb-8">
            ← Back to All Articles
          </Button>
        </Link>

        <Badge variant="primary" className="mb-4">
          {article.category}
        </Badge>

        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-tight">
          {article.title}
        </h1>

        <div className="flex items-center gap-4 text-sm text-slate-500 my-6 pb-6 border-b border-slate-200 dark:border-slate-800">
          <span>By {article.authorName}</span>
          <span>•</span>
          <span>{article.publishedAt}</span>
          <span>•</span>
          <span>{article.readTimeMinutes} min read</span>
        </div>

        {/* Featured Image */}
        <div
          className="w-full h-96 rounded-2xl bg-cover bg-center my-8 shadow-xl"
          style={{ backgroundImage: `url(${article.featuredImageUrl})` }}
        />

        {/* Article Body */}
        <div
          className="prose dark:prose-invert max-w-none text-base sm:text-lg leading-relaxed space-y-6"
          dangerouslySetInnerHTML={{ __html: article.contentHtml || article.summary }}
        />
      </div>
    </article>
  )
}
