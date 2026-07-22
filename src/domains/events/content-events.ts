export interface ContentPublishedEvent {
  type: 'CONTENT_PUBLISHED'
  eventVersion: 'v1'
  contentType: 'page' | 'post' | 'faq'
  contentId: string
  slug: string
  timestamp: string
}

export type ContentDomainEvent = ContentPublishedEvent
