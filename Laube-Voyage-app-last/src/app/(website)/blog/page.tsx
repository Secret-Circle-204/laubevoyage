import 'server-only'
import { getAllBlogPosts } from '@/services/blog'
import Image from 'next/image'
import Link from 'next/link'
import { AnimatedSection, AnimatedContainer } from '@/components/premium-ui/AnimatedSection'

export default async function BlogPage() {
  const posts = await getAllBlogPosts()

  return (
    <main className="min-h-screen bg-[#FAFAFA] dark:bg-[#231F20] transition-colors duration-500">
      {/* Hero Section */}
      <section className="relative h-[50vh] flex items-center justify-center overflow-hidden">
        <Image
          src="https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1935&auto=format&fit=crop"
          alt="Travel Blog"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-[#231F20]/40 dark:bg-[#231F20]/70 transition-colors duration-500" />

        <div className="relative z-10 container mx-auto px-4 text-center">
          <AnimatedSection animation="fade-up">
            <span className="text-[#00AEEF] text-sm tracking-[0.4em] uppercase mb-4 block">
              Travel Journal
            </span>
            <h1 className="text-5xl md:text-7xl font-serif font-light text-white mb-6">
              Stories & <span className="text-[#F58220]">Inspiration</span>
            </h1>
            <p className="text-white/80 max-w-2xl mx-auto text-lg font-light tracking-wide">
              Insights, tips, and tales from the most extraordinary corners of the globe.
            </p>
          </AnimatedSection>
        </div>
      </section>

      {/* Blog Feed */}
      <section className="py-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {posts.length > 0 ? (
            <AnimatedContainer
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10"
              staggerDelay={0.1}
            >
              {posts.map((post) => {
                const featuredImage =
                  typeof post.featuredImage === 'object' ? post.featuredImage : undefined
                const imageUrl =
                  featuredImage?.url ||
                  'https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1935&auto=format&fit=crop'

                return (
                  <article
                    key={post.id}
                    className="group flex flex-col bg-white dark:bg-[#1a1718] border border-[#231F20]/5 dark:border-[#A7AAAC]/10 rounded-xl overflow-hidden transition-all duration-500 hover:shadow-2xl"
                  >
                    <Link href={`/blog/${post.slug}`} className="flex flex-col h-full">
                      <div className="relative h-64 w-full overflow-hidden">
                        <Image
                          src={imageUrl}
                          alt={post.title}
                          fill
                          className="object-cover transition-transform duration-1000 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-linear-to-t from-black/20 dark:from-[#1a1718] via-transparent opacity-40 transition-colors" />

                        {post.categories && post.categories.length > 0 && (
                          <div className="absolute top-6 left-6">
                            <span className="px-4 py-1.5 bg-[#F58220] text-white text-[10px] tracking-[0.2em] uppercase font-bold rounded-sm shadow-xl">
                              {post.categories[0]
                                .replace('-', ' ')
                                .replace(/\b\w/g, (l: string) => l.toUpperCase())}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="p-8 flex flex-col grow">
                        <div className="flex items-center gap-4 mb-4">
                          <time className="text-[10px] tracking-widest uppercase text-[#666666] dark:text-[#A7AAAC] transition-colors">
                            {post.publishedAt
                              ? new Date(post.publishedAt).toLocaleDateString('en-US', {
                                  month: 'long',
                                  day: 'numeric',
                                  year: 'numeric',
                                })
                              : 'Recently'}
                          </time>
                          <div className="h-px w-8 bg-[#00AEEF]/30" />
                        </div>

                        <h2 className="text-2xl font-serif font-light mb-4 text-[#231F20] dark:text-white group-hover:text-[#F58220] dark:group-hover:text-[#F58220] transition-colors duration-300">
                          {post.title}
                        </h2>

                        <p className="text-sm mb-6 line-clamp-3 leading-relaxed grow text-[#666666] dark:text-[#A7AAAC] transition-colors">
                          {post.excerpt || 'Read more about this exciting travel story...'}
                        </p>

                        <div className="flex items-center gap-2 group-hover:gap-4 transition-all duration-300">
                          <span className="text-[10px] tracking-[0.2em] uppercase font-bold text-[#2E3192] dark:text-[#F58220] transition-colors">
                            Read Journal
                          </span>
                          <span className="text-[#2E3192] dark:text-[#F58220] transition-colors">
                            →
                          </span>
                        </div>
                      </div>
                    </Link>
                  </article>
                )
              })}
            </AnimatedContainer>
          ) : (
            <div className="text-center py-24">
              <p className="text-[#666666] dark:text-[#A7AAAC] text-lg font-light transition-colors">
                Our stories are being penned. Check back soon for inspiration.
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  )
}
