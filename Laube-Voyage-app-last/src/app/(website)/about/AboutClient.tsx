'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion, useScroll, useTransform, Variants } from 'framer-motion'

import { useTheme } from '@/components/providers/ThemeProvider'
import { Media } from '@/payload-types'

// Simple interface for Lexical RichText content
interface RichTextContent {
  root?: {
    children?: Array<{
      type: string
      children?: Array<{ text?: string }>
    }>
  }
}

// Simple Helper for RichText (Lexical)
const RenderRichText = ({ content }: { content: RichTextContent | null | undefined }) => {
  if (!content?.root?.children) return null
  return content.root.children.map((block, i: number) => {
    if (block.type === 'paragraph') {
      return (
        <p key={i} className="mb-6 leading-relaxed">
          {block.children?.map((child, j: number) => (
            <span key={j}>{child.text}</span>
          ))}
        </p>
      )
    }
    return null
  })
}

interface AboutClientProps {
  data: {
    hero?: { title?: string | null; subtitle?: string | null; image?: Media | number | null }
    history?: { content?: RichTextContent | null; image?: Media | number | null }
    philosophy?: {
      content?: RichTextContent | null
      characteristics?: string | null
    }
    specializedPrograms?: {
      cultural?: { description?: RichTextContent | null; image?: Media | number | null }
      adventure?: { description?: RichTextContent | null; image?: Media | number | null }
    }
    transport?: { content?: RichTextContent | null; image?: Media | number | null }
    missionVision?: { mission?: RichTextContent | null; vision?: RichTextContent | null }
    management?: Array<{
      name?: string | null
      position?: string | null
      bio?: RichTextContent | null
      image?: Media | number | null
    }> | null
    accreditations?: Array<{ title?: string | null; logo?: Media | number | null }> | null
  }
}

export default function AboutClient({ data }: AboutClientProps) {
  const { theme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const isDark = mounted ? theme === 'dark' : true

  useEffect(() => {
    setMounted(true)
  }, [])

  const {
    hero,
    history,
    philosophy,
    specializedPrograms,
    transport,
    missionVision,
    management,
    accreditations,
  } = data

  const { scrollYProgress } = useScroll()
  const heroY = useTransform(scrollYProgress, [0, 0.5], [0, 200])
  const heroOpacity = useTransform(scrollYProgress, [0, 0.3], [1, 0])

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.3,
      },
    },
  }

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] },
    },
  }

  return (
    <main
      className={`min-h-screen ${isDark ? 'bg-dark' : 'bg-background'} transition-colors duration-500 overflow-hidden`}
    >
      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        <motion.div style={{ y: heroY }} className="absolute inset-0 z-0">
          {hero?.image && (
            <Image
              src={typeof hero.image === 'object' ? (hero.image.url ?? '') : ''}
              alt={hero?.title || 'Hero'}
              fill
              className="object-cover scale-110"
              priority
            />
          )}
          <div className="absolute inset-0 bg-black/40 dark:bg-black/60" />
        </motion.div>

        <motion.div
          style={{ opacity: heroOpacity }}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
          className="relative z-10 text-center px-4 max-w-5xl mx-auto"
        >
          <h1 className="text-6xl md:text-8xl lg:text-9xl font-serif text-white mb-8 tracking-tighter drop-shadow-2xl">
            {hero?.title ?? ''}
          </h1>
          <p className="text-lg md:text-xl text-white/90 font-light tracking-[0.5em] uppercase max-w-2xl mx-auto border-y border-white/20 py-6 backdrop-blur-sm">
            {hero?.subtitle ?? ''}
          </p>
        </motion.div>

        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4 text-white/60"
        >
          <span className="text-[0.65rem] uppercase tracking-[0.4em] font-medium">
            Scroll to discover
          </span>
          <div className="w-px h-16 bg-linear-to-b from-white/60 to-transparent" />
        </motion.div>
      </section>

      {/* History Section */}
      <section
        className={`py-32 md:py-48 container mx-auto px-6 ${isDark ? 'bg-dark' : 'bg-background'}`}
      >
        <div className="grid lg:grid-cols-2 gap-24 items-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={containerVariants}
            className="space-y-12"
          >
            <motion.div variants={itemVariants}>
              <span className="text-accent text-xs tracking-[0.5em] uppercase font-black px-6 py-2 border border-accent/20 rounded-none inline-block mb-4">
                Est. 1996
              </span>
              <h2
                className={`text-5xl md:text-7xl font-serif ${isDark ? 'text-white' : 'text-dark dark:text-white'} leading-[1.05]`}
              >
                A Quarter Century of <br />
                <span className="text-primary dark:text-secondary">Elite Expertise</span>
              </h2>
            </motion.div>
            <motion.div
              variants={itemVariants}
              className={`prose prose-xl ${isDark ? 'prose-invert text-stone-400' : 'text-foreground/70'} font-light leading-relaxed max-w-xl`}
            >
              <RenderRichText content={history?.content} />
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
            viewport={{ once: true }}
            className="relative"
          >
            <div
              className={`relative h-[650px] rounded-none overflow-hidden shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)] group mx-auto lg:max-w-none border ${isDark ? 'border-white/5' : 'border-black/5'}`}
            >
              {history?.image && (
                <Image
                  src={typeof history.image === 'object' ? (history.image.url ?? '') : ''}
                  alt="History"
                  fill
                  className="object-cover transition-transform duration-1000 group-hover:scale-110"
                />
              )}
            </div>
            {/* Decorative Element */}
            <div className="absolute -bottom-8 -left-8 w-48 h-48 border-l-2 border-b-2 border-accent/20 rounded-none -z-10" />
          </motion.div>
        </div>
      </section>

      {/* Mission & Vision Section */}
      <section className={`py-32 container mx-auto px-6 ${isDark ? 'bg-dark' : 'bg-background'}`}>
        <div className="grid md:grid-cols-2 gap-16 lg:gap-32">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className={`py-10 px-8 border ${isDark ? 'bg-white/5 border-white/10 shadow-none' : 'bg-orange-50/50 border-stone-100 shadow-sm'} relative overflow-hidden group`}
          >
            <h3 className="text-3xl font-serif text-accent mb-8 tracking-widest uppercase">
              Our Mission
            </h3>
            <div
              className={`text-lg ${isDark ? 'text-stone-400' : 'text-stone-600'} leading-relaxed font-light italic`}
            >
              <RenderRichText content={missionVision?.mission} />
            </div>
            <div className="absolute bottom-0 left-0 w-full h-1 bg-accent/20 scale-x-0 group-hover:scale-x-100 transition-transform duration-700 origin-left" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className={`py-10 px-8 border ${isDark ? 'bg-white/5 border-white/10 shadow-none' : 'bg-orange-50/50 border-stone-100 shadow-sm'} relative overflow-hidden group`}
          >
            <h3 className="text-3xl font-serif text-secondary mb-8 tracking-widest uppercase">
              Our Vision
            </h3>
            <div
              className={`text-lg ${isDark ? 'text-stone-400' : 'text-stone-600'} leading-relaxed font-light italic`}
            >
              <RenderRichText content={missionVision?.vision} />
            </div>
            <div className="absolute bottom-0 left-0 w-full h-1 bg-secondary/20 scale-x-0 group-hover:scale-x-100 transition-transform duration-700 origin-left" />
          </motion.div>
        </div>
      </section>

      {/* Philosophy Section */}
      <section
        className={`${isDark ? 'bg-[#1a1718] border-white/5' : 'bg-stone-50 border-stone-100'} py-32 overflow-hidden border-y`}
      >
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center max-w-4xl mx-auto mb-20"
          >
            <h2
              className={`text-4xl md:text-6xl font-serif ${isDark ? 'text-white' : 'text-dark dark:text-white'} mb-8`}
            >
              Our Visionary Approach
            </h2>
            <div className="h-1 w-24 bg-accent mx-auto mb-10" />
            <div
              className={`text-xl ${isDark ? 'text-stone-400' : 'text-foreground/60'} font-light italic leading-loose`}
            >
              <RenderRichText content={philosophy?.content} />
            </div>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-10">
            {philosophy?.characteristics
              ?.split('\n')
              .filter(Boolean)
              .map((item: string, idx: number) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                viewport={{ once: true }}
                whileHover={{ y: -10, scale: 1.02 }}
                className={`${isDark ? 'bg-white/5 border-white/10 shadow-none' : 'bg-orange-50 border-stone-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)]'} p-12 rounded-none hover:shadow-2xl transition-all duration-500 border group`}
              >
                <div className="text-4xl font-serif text-secondary mb-8 opacity-40 italic transition-transform group-hover:scale-110 group-hover:opacity-100">
                  {idx + 1 < 10 ? `0${idx + 1}` : idx + 1}
                </div>
                <h3
                  className={`text-xl tracking-[0.25em] uppercase font-bold ${isDark ? 'text-white' : 'text-dark dark:text-white'} group-hover:text-accent transition-colors`}
                >
                  {item.trim()}
                </h3>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Management & Team Section */}
      <section
        className={`py-32 md:py-48 container mx-auto px-6 ${isDark ? 'bg-dark' : 'bg-background'}`}
      >
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-24"
        >
          <span className="text-accent text-xs tracking-[0.5em] uppercase font-black block mb-4">
            Elite Professionals
          </span>
          <h2
            className={`text-5xl md:text-7xl font-serif ${isDark ? 'text-white' : 'text-dark dark:text-white'} leading-tight`}
          >
            Management <br /> <span className="text-secondary italic">Structure</span>
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-16">
          {management?.map((member, i: number) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="group"
            >
              <div className="relative aspect-4/5 overflow-hidden mb-8 border border-white/5 shadow-2xl">
                {member.image && (
                  <Image
                    src={typeof member.image === 'object' ? (member.image.url ?? '') : ''}
                    alt={member.name ?? ''}
                    fill
                    className="object-cover transition-transform duration-1000 group-hover:scale-110 grayscale group-hover:grayscale-0"
                  />
                )}
                <div className="absolute inset-0 bg-linear-to-t from-dark/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              </div>
              <h4
                className={`text-2xl font-serif ${isDark ? 'text-white' : 'text-dark dark:text-white'} mb-1`}
              >
                {member.name ?? ''}
              </h4>
              <p className="text-accent text-xs uppercase tracking-[0.3em] font-bold mb-4">
                {member.position ?? ''}
              </p>
              <div
                className={`text-sm ${isDark ? 'text-stone-400' : 'text-stone-500'} font-light leading-relaxed line-clamp-3 group-hover:line-clamp-none transition-all duration-500`}
              >
                <RenderRichText content={member.bio} />
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Accreditations & Licenses Strip */}
      <section
        className={`${isDark ? 'bg-black/40 border-white/5' : 'bg-stone-100 border-stone-200'} py-20 border-y overflow-hidden`}
      >
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-12">
            <div className="max-w-xs text-center md:text-left">
              <h5
                className={`text-[10px] uppercase tracking-[0.4em] font-black ${isDark ? 'text-stone-500' : 'text-stone-400'} mb-2`}
              >
                Authenticated Service
              </h5>
              <p className={`text-sm font-medium ${isDark ? 'text-stone-300' : 'text-stone-600'}`}>
                Official travel licenses & international certifications.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-16 grayscale opacity-50 hover:grayscale-0 hover:opacity-100 transition-all duration-700">
              {accreditations?.map((item, i: number) => (
                <div key={i} className="flex flex-col items-center gap-3">
                  {item.logo && (
                    <div className="relative w-32 h-16">
                      <Image
                        src={typeof item.logo === 'object' ? (item.logo.url ?? '') : ''}
                        alt={item.title ?? ''}
                        fill
                        className="object-contain"
                      />
                    </div>
                  )}
                  <span className="text-[10px] uppercase tracking-widest font-bold text-stone-500 text-center">
                    {item.title ?? ''}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Specialized Programs */}
      <section
        className={`py-32 md:py-48 container mx-auto px-6 ${isDark ? 'bg-dark' : 'bg-background'}`}
      >
        <div className="space-y-48">
          {/* Cultural */}
          <div className="grid lg:grid-cols-2 gap-32 items-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1 }}
              viewport={{ once: true }}
              className="relative aspect-square md:aspect-4/5 rounded-none overflow-hidden shadow-2xl group"
            >
              {specializedPrograms?.cultural?.image && (
                <Image
                  src={
                    typeof specializedPrograms.cultural.image === 'object'
                      ? (specializedPrograms.cultural.image.url ?? '')
                      : ''
                  }
                  alt="Cultural"
                  fill
                  className="object-cover transition-transform duration-1000 group-hover:scale-110"
                />
              )}
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-10"
            >
              <h3
                className={`text-5xl md:text-6xl font-serif ${isDark ? 'text-secondary' : 'text-primary'}`}
              >
                Cultural Treasures
              </h3>
              <div
                className={`text-xl ${isDark ? 'text-stone-400' : 'text-foreground/70'} leading-relaxed font-light`}
              >
                <RenderRichText content={specializedPrograms?.cultural?.description} />
              </div>
              <Link
                href="/destinations"
                className="inline-flex items-center gap-6 text-accent font-bold tracking-[0.3em] uppercase hover:gap-8 transition-all group group"
              >
                Global Traditions
                <span className="text-3xl group-hover:translate-x-3 transition-transform">→</span>
              </Link>
            </motion.div>
          </div>

          {/* Adventure */}
          <div className="grid lg:grid-cols-2 gap-32 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-10 lg:order-1 order-2"
            >
              <h3 className="text-5xl md:text-6xl font-serif text-accent">Elite Adventure</h3>
              <div
                className={`text-xl ${isDark ? 'text-stone-400' : 'text-foreground/70'} leading-relaxed font-light`}
              >
                <RenderRichText content={specializedPrograms?.adventure?.description} />
              </div>
              <Link
                href="/contact"
                className={`inline-flex items-center gap-6 ${isDark ? 'text-secondary' : 'text-primary'} font-bold tracking-[0.3em] uppercase hover:gap-8 transition-all group`}
              >
                Start Expedition
                <span className="text-3xl group-hover:translate-x-3 transition-transform">→</span>
              </Link>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1 }}
              viewport={{ once: true }}
              className="relative aspect-square md:aspect-4/5 rounded-none overflow-hidden shadow-2xl lg:order-2 order-1 group"
            >
              {specializedPrograms?.adventure?.image && (
                <Image
                  src={
                    typeof specializedPrograms.adventure.image === 'object'
                      ? (specializedPrograms.adventure.image.url ?? '')
                      : ''
                  }
                  alt="Adventure"
                  fill
                  className="object-cover transition-transform duration-1000 group-hover:scale-110"
                />
              )}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Transport Section */}
      <section
        className={`py-32 text-white relative overflow-hidden ${isDark ? 'bg-black' : 'bg-stone-950'}`}
      >
        <div className="container mx-auto px-6 grid lg:grid-cols-2 gap-24 items-center">
          <div className="space-y-12">
            <h2 className="text-5xl md:text-6xl font-serif leading-tight">
              An Elite Fleet for
              <br />
              <span className="italic text-secondary">Seamless Transitions</span>
            </h2>
            <div className="text-lg text-stone-400 font-light leading-relaxed max-w-lg">
              <RenderRichText content={transport?.content} />
            </div>
            <div className="grid grid-cols-2 gap-12 pt-8">
              <div className="border-l border-white/10 pl-8">
                <div className="text-4xl font-serif text-accent mb-2">Air-Con</div>
                <div className="text-stone-500 text-xs uppercase tracking-[0.3em] font-medium">
                  Climate Control
                </div>
              </div>
              <div className="border-l border-white/10 pl-8">
                <div className="text-4xl font-serif text-accent mb-2">Expert</div>
                <div className="text-stone-500 text-xs uppercase tracking-[0.3em] font-medium">
                  Licensed Drivers
                </div>
              </div>
            </div>
          </div>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative h-[650px] rounded-none overflow-hidden shadow-2xl border border-white/5"
          >
            {transport?.image && (
              <Image
                src={typeof transport.image === 'object' ? (transport.image.url ?? '') : ''}
                alt="Transport"
                fill
                className="object-cover"
              />
            )}
            <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent" />
          </motion.div>
        </div>
      </section>

      {/* Modern CTA */}
      <section
        className={`py-48 transition-colors border-t relative overflow-hidden ${isDark ? 'bg-dark border-white/5' : 'bg-background border-stone-100'}`}
      >
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(circle_at_center,var(--color-primary-light)_0%,transparent_70%)] opacity-5 dark:opacity-10" />
        <div className="container mx-auto px-6 text-center space-y-16 relative z-10">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className={`text-5xl md:text-8xl font-serif leading-[1.1] ${isDark ? 'text-white' : 'text-dark dark:text-white'}`}
          >
            Your Passport to
            <br />
            <span
              className={`italic underline decoration-accent/30 underline-offset-12 ${isDark ? 'text-secondary' : 'text-primary'}`}
            >
              Discover and Explore
            </span>
          </motion.h2>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="flex flex-wrap justify-center gap-10 pt-8"
          >
            <Link
              href="/packages"
              className="px-14 py-6 bg-accent hover:scale-105 transition-all duration-300 rounded-none text-white text-sm font-black tracking-[0.4em] uppercase shadow-[0_20px_50px_rgba(245,130,32,0.3)] overflow-hidden relative group"
            >
              <span className="relative z-10">Start Your Voyage</span>
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
            </Link>
            <Link
              href="/contact"
              className={`px-14 py-6 border-2 ${isDark ? 'border-secondary text-secondary hover:bg-secondary' : 'border-primary text-primary hover:bg-primary'} hover:text-white transition-all duration-500 rounded-none text-sm font-black tracking-[0.4em] uppercase`}
            >
              Inquire Now
            </Link>
          </motion.div>
        </div>
      </section>
    </main>
  )
}
