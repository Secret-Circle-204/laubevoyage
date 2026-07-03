import { CollectionSlug, GlobalSlug } from 'payload'
import {
  Briefcase,
  CalendarCheck,
  FileText,
  Globe,
  Home,
  Hotel,
  Image,
  LayoutGrid,
  LucideProps,
  Mail,
  MapPin,
  MessageSquare,
  Star,
  TreePalm,
  Users,
} from 'lucide-react'
import { ExoticComponent } from 'react'

/**
 * Icon map for L'Aube Voyage Admin Navigation
 * Maps collection/global slugs to Lucide React icons
 */
export const navIconMap: Partial<
  Record<CollectionSlug | GlobalSlug, ExoticComponent<LucideProps>>
> = {
  // System / Collections
  users: Users,
  media: Image,

  // Travel Collections
  packages: Briefcase,
  excursions: TreePalm,
  bookings: CalendarCheck,
  destinations: Globe,
  hotels: Hotel,
  cities: MapPin,
  'blog-posts': FileText,
  'loyalty-points': Star,
  emails: Mail,
  'contact-inquiries': MessageSquare,
  reviews: Star,

  // Globals
  'company-settings': LayoutGrid,
  'home-page': Home,
  'about-page-config': Globe,
}

export const getNavIcon = (slug: string) =>
  Object.hasOwn(navIconMap, slug) ? navIconMap[slug as CollectionSlug | GlobalSlug] : FileText
