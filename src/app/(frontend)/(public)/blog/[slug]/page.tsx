import React from 'react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ArticleLoader } from '@/application/blog/loaders'
import { ArticleReaderPage } from '@/components/features/blog/ArticleReaderPage'

export const revalidate = 3600

export async function generateMetadata(props: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const params = await props.params
  const article = await ArticleLoader.loadBySlug(params.slug)

  if (!article) {
    return { title: "Article Not Found | L'Aube Voyage" }
  }

  return {
    title: `${article.title} | L'Aube Voyage Journal`,
    description: article.summary,
  }
}

import { cookies } from 'next/headers'

export default async function Page(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params
  const cookieStore = await cookies()
  const locale = cookieStore.get('laube-locale')?.value || 'en'
  const article = await ArticleLoader.loadBySlug(params.slug, { locale })

  if (!article) {
    notFound()
  }

  return <ArticleReaderPage article={article} />
}
