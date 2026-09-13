import type { HomeFeaturedExperienceDTO } from '@/application/pages/home/dto'

export interface ExperienceCardLabels {
  packageLabel?: string
  dailyTourLabel?: string
  viewItinerary?: string
  fromPerAdult?: string
  daySingular?: string
  dayPlural?: string
  guestSingular?: string
}

export interface ExperienceCardProps {
  experience: HomeFeaturedExperienceDTO
  variant?: 'featured' | 'catalog' | 'compact'
  withAmbientGlow?: boolean
  priority?: boolean
  className?: string
  labels?: ExperienceCardLabels
  onHover?: (imageUrl: string) => void
  onLeave?: () => void
}
