import 'server-only'
import { getBlogPostBySlug, getAllBlogPosts } from '@/services/blog'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { AnimatedSection } from '@/components/premium-ui/AnimatedSection'
import Link from 'next/link'
import { SimpleRichText } from '@/components/ui/SimpleRichText'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  const posts = await getAllBlogPosts()
  return posts
    .filter((post) => typeof post.slug === 'string' && post.slug.length > 0)
    .map((post) => ({
      slug: post.slug,
    }))
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params
  const post = await getBlogPostBySlug(slug)

  if (!post) notFound()

  const featuredImage = typeof post.featuredImage === 'object' ? post.featuredImage : undefined
  const imageUrl =
    featuredImage?.url ||
    'https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1935&auto=format&fit=crop'
  const author = typeof post.author === 'object' ? post.author : undefined

  return (
    <main className="min-h-screen bg-[#FAFAFA] dark:bg-[#231F20] transition-colors duration-500">
      {/* Hero */}
      <section className="relative h-[60vh] overflow-hidden">
        <Image src={imageUrl} alt={post.title} fill className="object-cover" priority />
        <div className="absolute inset-0 bg-[#231F20]/40 dark:bg-[#231F20]/70 transition-colors" />

        <div className="relative z-10 container mx-auto px-4 h-full flex flex-col justify-end pb-24">
          <AnimatedSection animation="fade-up">
            <div className="max-w-4xl">
              {(post.categories?.length ?? 0) > 0 && (
                <div className="flex gap-2 mb-6">
                  {post.categories?.map((cat: string) => (
                    <span
                      key={cat}
                      className="px-4 py-1.5 bg-[#F58220] text-white text-[10px] tracking-[0.2em] uppercase font-bold rounded-sm"
                    >
                      {cat.replace('-', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                    </span>
                  ))}
                </div>
              )}
              <h1 className="text-4xl md:text-6xl font-serif font-light text-white mb-8 border-l-4 border-[#00AEEF] pl-8">
                {post.title}
              </h1>
              <div className="flex items-center gap-6 text-white/60 text-xs tracking-[0.2em] uppercase">
                {author && (
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-[#00AEEF]/20 flex items-center justify-center border border-[#00AEEF]/30 text-white font-serif">
                      {author.email?.[0]?.toUpperCase() || 'A'}
                    </div>
                    <span>{author.email?.split('@')[0] || 'Author'}</span>
                  </div>
                )}
                <div className="h-px w-8 bg-white/20" />
                {post.publishedAt && (
                  <time>
                    {new Date(post.publishedAt).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </time>
                )}
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Content */}
      <article className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto max-w-4xl">
          <AnimatedSection animation="fade-up" delay={0.2}>
            <div className="prose prose-lg max-w-none dark:prose-invert">
              {post.excerpt && (
                <p className="text-2xl font-serif italic mb-12 border-l-2 border-[#F58220] pl-8 leading-relaxed text-[#231F20]/80 dark:text-white/80 transition-colors">
                  {post.excerpt}
                </p>
              )}

              <div className="leading-loose space-y-8 text-lg font-light tracking-wide text-[#666666] dark:text-[#A7AAAC] transition-colors">
                <SimpleRichText content={post.content} />
              </div>
            </div>
          </AnimatedSection>

          {/* Back to Journal */}
          <div className="mt-24 pt-12 border-t border-[#A7AAAC]/10 flex justify-center">
            <Link href="/blog">
              <button className="px-12 py-5 border border-[#2E3192]/50 dark:border-[#00AEEF]/50 text-[#2E3192] dark:text-[#00AEEF] text-xs tracking-[0.3em] uppercase hover:bg-[#F58220] hover:text-white hover:border-[#F58220] transition-all duration-500">
                Back to Journal
              </button>
            </Link>
          </div>
        </div>
      </article>
    </main>
  )
}
