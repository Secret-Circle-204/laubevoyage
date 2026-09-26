import type { Where } from 'payload'

/**
 * Extracts all leaf field conditions from any valid Payload Where structure.
 * Recursively inspects top-level fields, `and` arrays, and `or` arrays (such as WhereBuilder hoisted formats).
 */
export function extractClauseMap(where: Where | undefined): Map<string, Record<string, any>> {
  const map = new Map<string, Record<string, any>>()
  if (!where || typeof where !== 'object') return map

  const processNode = (node: any) => {
    if (!node || typeof node !== 'object') return

    // 1. Process `or` array
    if (Array.isArray(node.or)) {
      for (const item of node.or) {
        processNode(item)
      }
    }

    // 2. Process `and` array
    if (Array.isArray(node.and)) {
      for (const item of node.and) {
        processNode(item)
      }
    }

    // 3. Process direct field keys (excluding reserved logical operators 'and', 'or')
    for (const [key, val] of Object.entries(node)) {
      if (key !== 'and' && key !== 'or' && val && typeof val === 'object') {
        map.set(key, val as Record<string, any>)
      }
    }
  }

  processNode(where)
  return map
}

/**
 * Pure, deterministic composition helper for Payload Where queries.
 * Does NOT manage query state. Does NOT reinvent useListQuery.
 * Takes current Payload Where query state + field + new field condition,
 * and returns the merged canonical Where object for Payload's refineListData / handleWhereChange.
 *
 * Guaranteed Properties:
 * 1. Pure & Deterministic: Same input always produces the exact same canonical output.
 * 2. Field Isolation: Modifying one field leaves all other field conditions strictly intact.
 * 3. Flat Canonical Structure: Prevents recursive `and` -> `or` -> `and` nesting blowups.
 * 4. Zero Semantic Corruption: Preserves field names, operators, and values exactly as declared.
 */
export function composeWhere(
  currentWhere: Where | undefined,
  field: string,
  condition: Record<string, any> | undefined | null,
): Where {
  const clauseMap = extractClauseMap(currentWhere)

  if (!condition || typeof condition !== 'object' || Object.keys(condition).length === 0) {
    clauseMap.delete(field)
  } else {
    clauseMap.set(field, condition)
  }

  if (clauseMap.size === 0) {
    return {}
  }

  if (clauseMap.size === 1) {
    const [singleField, singleCondition] = Array.from(clauseMap.entries())[0]
    return { [singleField]: singleCondition }
  }

  return {
    and: Array.from(clauseMap.entries()).map(([f, c]) => ({ [f]: c })),
  }
}
