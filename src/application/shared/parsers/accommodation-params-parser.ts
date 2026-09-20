/**
 * Accommodation Params Parser Layer
 * Parses and validates raw URL searchParams for accommodation option selections.
 * Canonical format: "<stayOrder>:<optionId>,<stayOrder>:<optionId>"
 * Example: "1:option-a,2:option-c" -> { 1: "option-a", 2: "option-c" }
 */
export class AccommodationParamsParser {
  static parse(raw?: string | null): Record<number, string> | undefined {
    if (!raw || typeof raw !== 'string' || raw.trim() === '') return undefined

    const result: Record<number, string> = {}
    const segments = raw.split(',')

    for (const segment of segments) {
      const trimmed = segment.trim()
      if (!trimmed) continue

      const colonIdx = trimmed.indexOf(':')
      if (colonIdx <= 0) continue

      const orderStr = trimmed.slice(0, colonIdx).trim()
      const optionId = trimmed.slice(colonIdx + 1).trim()

      const orderNum = Number(orderStr)
      if (!isNaN(orderNum) && orderNum > 0 && optionId.length > 0) {
        result[orderNum] = optionId
      }
    }

    return Object.keys(result).length > 0 ? result : undefined
  }
}
