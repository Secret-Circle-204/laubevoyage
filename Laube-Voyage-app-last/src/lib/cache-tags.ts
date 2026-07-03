export const CACHE_TAGS = {
  destinations: 'destinations',
  packages: 'packages',
  excursions: 'excursions',
  blog: 'blog',
  company: 'company',
  home: 'home',
} as const

export type CacheTag = typeof CACHE_TAGS[keyof typeof CACHE_TAGS]
