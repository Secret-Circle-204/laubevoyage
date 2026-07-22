import type { ContentPageEntity, PageBlockEntity } from './types'

/**
 * Dynamic CMS Page & Block Layout Engine
 * Zero hardcoded text in frontend pages; all layouts query CMS definitions.
 */
export class ContentPageEngine {
  static renderPageBlocks(blocks: PageBlockEntity[]): Record<string, unknown>[] {
    return blocks.map((b) => ({
      blockId: b.blockId,
      type: b.blockType,
      title: b.title,
      content: b.contentJson,
    }))
  }
}
