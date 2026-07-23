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

export default async function Page(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params
  const article = await ArticleLoader.loadBySlug(params.slug)

  if (!article) {
    notFound()
  }

  return <ArticleReaderPage article={article} />
}
