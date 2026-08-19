import { describe, test, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

function getFilesRecursively(dir: string): string[] {
  let results: string[] = []
  if (!fs.existsSync(dir)) return results
  const list = fs.readdirSync(dir)
  list.forEach((file) => {
    const fullPath = path.join(dir, file)
    const stat = fs.statSync(fullPath)
    if (stat && stat.isDirectory()) {
      results = results.concat(getFilesRecursively(fullPath))
    } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
      if (!fullPath.endsWith('.test.ts') && !fullPath.endsWith('.spec.ts')) {
        results.push(fullPath)
      }
    }
  })
  return results
}

describe('Architecture Constitution Guards (Rules A - G)', () => {
  const domainsDir = path.join(process.cwd(), 'src', 'domains')
  const appRoutesDir = path.join(process.cwd(), 'src', 'app')
  const collectionsDir = path.join(process.cwd(), 'src', 'collections')

  const domainFiles = getFilesRecursively(domainsDir)

  test('Rule A & B: Prohibit next/* and react imports inside src/domains', () => {
    const forbidden = ['next/server', 'next/headers', 'next/cookies', 'next/navigation', 'react']
    const violations: { file: string; line: string }[] = []

    domainFiles.forEach((filePath) => {
      const content = fs.readFileSync(filePath, 'utf-8')
      const lines = content.split('\n')

      lines.forEach((line) => {
        const trimmed = line.trim()
        if (trimmed.startsWith('import') || trimmed.includes('require(')) {
          forbidden.forEach((mod) => {
            if (trimmed.includes(`'${mod}'`) || trimmed.includes(`"${mod}"`)) {
              violations.push({ file: path.relative(process.cwd(), filePath), line: trimmed })
            }
          })
        }
      })
    })

    expect(violations, `Rule A/B Violation: Next/React imported in src/domains!\n${JSON.stringify(violations, null, 2)}`).toEqual([])
  })

  test('Rule C & E: Prohibit direct Payload ORM calls from API Routes and Collection Hooks', () => {
    const routeFiles = getFilesRecursively(appRoutesDir).filter((f) => f.includes('/api/'))
    const hookFiles = getFilesRecursively(collectionsDir).filter((f) => f.includes('/hooks/'))

    const targetFiles = [...routeFiles, ...hookFiles]
    const violations: { file: string; line: string }[] = []

    targetFiles.forEach((filePath) => {
      const content = fs.readFileSync(filePath, 'utf-8')
      const lines = content.split('\n')

      lines.forEach((line) => {
        const trimmed = line.trim()
        if (
          (trimmed.includes('req.payload.create') ||
            trimmed.includes('req.payload.update') ||
            trimmed.includes('req.payload.delete')) &&
          !filePath.endsWith('beforeCustomerDelete.ts')
        ) {
          violations.push({ file: path.relative(process.cwd(), filePath), line: trimmed })
        }
      })
    })

    expect(violations, `Rule C/E Violation: Direct Payload ORM query/mutation outside Repository!\n${JSON.stringify(violations, null, 2)}`).toEqual([])
  })

  test('Rule D: Prohibit Domain A importing Domain B Repository value directly', () => {
    const violations: { file: string; line: string }[] = []

    domainFiles.forEach((filePath) => {
      // Exclude composition root (factory.ts) and event subscribers (cross-domain event handlers)
      if (filePath.endsWith('factory.ts') || filePath.includes('subscribers')) return

      const content = fs.readFileSync(filePath, 'utf-8')
      const lines = content.split('\n')
      const currentDomainName = path.relative(domainsDir, filePath).split(path.sep)[0]

      lines.forEach((line) => {
        const trimmed = line.trim()
        // Allow type-only imports for constructor DI signatures; prohibit value imports of external Repositories
        if (trimmed.startsWith('import ') && !trimmed.startsWith('import type') && (trimmed.includes('/repository') || trimmed.includes('Repository'))) {
          if (trimmed.includes('../') && !trimmed.includes(`./${currentDomainName}`)) {
            const match = trimmed.match(/from\s+['"]([^'"]+)['"]/)
            if (match && match[1]) {
              const importedPath = match[1]
              if (importedPath.startsWith('../') && importedPath.includes('/repository')) {
                violations.push({ file: path.relative(process.cwd(), filePath), line: trimmed })
              }
            }
          }
        }
      })
    })

    expect(violations, `Rule D Violation: Cross-Domain Repository Value Import detected!\n${JSON.stringify(violations, null, 2)}`).toEqual([])
  })

  test('Rule F: Prohibit Aggregates from importing Infrastructure layers', () => {
    const aggregateFiles = domainFiles.filter((f) => f.includes('aggregate'))
    const violations: { file: string; line: string }[] = []

    aggregateFiles.forEach((filePath) => {
      const content = fs.readFileSync(filePath, 'utf-8')
      const lines = content.split('\n')

      lines.forEach((line) => {
        const trimmed = line.trim()
        if (trimmed.startsWith('import') && (trimmed.includes('infrastructure') || trimmed.includes('payload'))) {
          violations.push({ file: path.relative(process.cwd(), filePath), line: trimmed })
        }
      })
    })

    expect(violations, `Rule F Violation: Aggregate imports Infrastructure!\n${JSON.stringify(violations, null, 2)}`).toEqual([])
  })

  test('Rule H: Prohibit hardcoded static loyalty tier unions and constants in production code', () => {
    const productionDirs = [
      path.join(process.cwd(), 'src', 'domains'),
      path.join(process.cwd(), 'src', 'application'),
      path.join(process.cwd(), 'src', 'types'),
      path.join(process.cwd(), 'src', 'components'),
    ]

    const allProdFiles = productionDirs.flatMap((d) => getFilesRecursively(d))
    const violations: { file: string; line: string; reason: string }[] = []

    const staticUnionPattern = /['"]explorer['"]\s*\|\s*['"]voyager['"]/i
    const staticObjectPattern = /export\s+const\s+LoyaltyTier\s*=\s*\{/
    const staticTierConfigPattern = /export\s+const\s+TIER_CONFIG\s*=\s*\{/
    const staticEnumAccessPattern = /LoyaltyTier\.(EXPLORER|VOYAGER|ELITE)/
    const staticFallbackPattern = /\|\|\s*['"](explorer|voyager|elite)['"]/i
    const staticSwitchPattern = /switch\s*\(\s*(tier|currentTier)\s*\)/i

    allProdFiles.forEach((filePath) => {
      const content = fs.readFileSync(filePath, 'utf-8')
      const lines = content.split('\n')

      lines.forEach((line) => {
        const trimmed = line.trim()
        if (staticUnionPattern.test(trimmed)) {
          violations.push({
            file: path.relative(process.cwd(), filePath),
            line: trimmed,
            reason: 'Hardcoded static tier union detected',
          })
        }
        if (staticObjectPattern.test(trimmed)) {
          violations.push({
            file: path.relative(process.cwd(), filePath),
            line: trimmed,
            reason: 'Hardcoded LoyaltyTier static enum object detected',
          })
        }
        if (staticTierConfigPattern.test(trimmed)) {
          violations.push({
            file: path.relative(process.cwd(), filePath),
            line: trimmed,
            reason: 'Hardcoded TIER_CONFIG static object detected',
          })
        }
        if (staticEnumAccessPattern.test(trimmed)) {
          violations.push({
            file: path.relative(process.cwd(), filePath),
            line: trimmed,
            reason: 'Static LoyaltyTier enum property access detected',
          })
        }
        if (staticFallbackPattern.test(trimmed)) {
          violations.push({
            file: path.relative(process.cwd(), filePath),
            line: trimmed,
            reason: 'Static tier string fallback detected',
          })
        }
        if (staticSwitchPattern.test(trimmed)) {
          violations.push({
            file: path.relative(process.cwd(), filePath),
            line: trimmed,
            reason: 'Switch statement on tier identifier detected',
          })
        }
      })
    })

    expect(
      violations,
      `Rule H Violation: Static Loyalty Tier hardcoding detected in production code!\n${JSON.stringify(violations, null, 2)}`,
    ).toEqual([])
  })

  test('Rule I: Prohibit hardcoded static language enums, static unions, and switches in production code', () => {
    const productionDirs = [
      path.join(process.cwd(), 'src', 'domains'),
      path.join(process.cwd(), 'src', 'application'),
      path.join(process.cwd(), 'src', 'types'),
      path.join(process.cwd(), 'src', 'components'),
    ]

    const allProdFiles = productionDirs.flatMap((d) => getFilesRecursively(d))
    const violations: { file: string; line: string; reason: string }[] = []

    const staticEnumPattern = /export\s+enum\s+Language\s*\{/
    const staticUnionPattern = /['"]en['"]\s*\|\s*['"]ar['"]\s*\|\s*['"]fr['"]/i
    const staticSwitchPattern = /switch\s*\(\s*(locale|language|langCode|lang)\s*\)/i

    allProdFiles.forEach((filePath) => {
      // Exclude dictionary.ts (which maps JSON dictionaries statically)
      if (filePath.endsWith('dictionary.ts')) return

      const content = fs.readFileSync(filePath, 'utf-8')
      const lines = content.split('\n')

      lines.forEach((line) => {
        const trimmed = line.trim()
        if (staticEnumPattern.test(trimmed)) {
          violations.push({
            file: path.relative(process.cwd(), filePath),
            line: trimmed,
            reason: 'Hardcoded static Language enum detected',
          })
        }
        if (staticUnionPattern.test(trimmed)) {
          violations.push({
            file: path.relative(process.cwd(), filePath),
            line: trimmed,
            reason: 'Hardcoded static language union detected',
          })
        }
        if (staticSwitchPattern.test(trimmed)) {
          violations.push({
            file: path.relative(process.cwd(), filePath),
            line: trimmed,
            reason: 'Switch statement on language code detected',
          })
        }
      })
    })

    expect(
      violations,
      `Rule I Violation: Static Language hardcoding detected in production code!\n${JSON.stringify(violations, null, 2)}`,
    ).toEqual([])
  })
})
