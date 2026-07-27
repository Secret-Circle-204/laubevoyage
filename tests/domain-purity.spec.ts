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
    } else if (fullPath.endsWith('.ts') && !fullPath.endsWith('.test.ts') && !fullPath.endsWith('.spec.ts')) {
      results.push(fullPath)
    }
  })
  return results
}

describe('Clean Architecture — Domain Purity Guardrails', () => {
  const domainsDir = path.join(process.cwd(), 'src', 'domains')
  const domainFiles = getFilesRecursively(domainsDir)

  test('Domain Services, Workflows, Aggregates, Policies and Events must NOT import Payload CMS', () => {
    const violations: { file: string; line: string }[] = []

    domainFiles.forEach((filePath) => {
      if (filePath.includes('repository.ts') || filePath.includes('repositories') || filePath.endsWith('event-bus.ts')) {
        return
      }

      const content = fs.readFileSync(filePath, 'utf-8')
      const lines = content.split('\n')

      lines.forEach((line) => {
        const trimmed = line.trim()
        if (
          (trimmed.startsWith('import') || trimmed.includes('require(')) &&
          (trimmed.includes("'payload'") || trimmed.includes('"payload"') || trimmed.includes('@payload-config'))
        ) {
          violations.push({ file: path.relative(process.cwd(), filePath), line: trimmed })
        }
      })
    })

    expect(violations, `Domain purity violation: Payload imported in src/domains core logic!\n${JSON.stringify(violations, null, 2)}`).toEqual([])
  })

  test('Domain Core must NOT import Web Transport or Next.js HTTP modules', () => {
    const forbiddenImports = ['next/server', 'next/headers', 'next/cookies', 'next/navigation', 'react', 'axios', 'fetch']
    const violations: { file: string; line: string }[] = []

    domainFiles.forEach((filePath) => {
      const content = fs.readFileSync(filePath, 'utf-8')
      const lines = content.split('\n')

      lines.forEach((line) => {
        const trimmed = line.trim()
        if (trimmed.startsWith('import') || trimmed.includes('require(')) {
          forbiddenImports.forEach((forbidden) => {
            if (trimmed.includes(`'${forbidden}'`) || trimmed.includes(`"${forbidden}"`)) {
              violations.push({ file: path.relative(process.cwd(), filePath), line: trimmed })
            }
          })
        }
      })
    })

    expect(violations, `Domain purity violation: Web/HTTP module imported in src/domains!\n${JSON.stringify(violations, null, 2)}`).toEqual([])
  })

  test('Domain Core must NOT import Infrastructure layer modules directly', () => {
    const violations: { file: string; line: string }[] = []

    domainFiles.forEach((filePath) => {
      const content = fs.readFileSync(filePath, 'utf-8')
      const lines = content.split('\n')

      lines.forEach((line) => {
        const trimmed = line.trim()
        if (
          (trimmed.startsWith('import') || trimmed.includes('require(')) &&
          (trimmed.includes('@/infrastructure/') || trimmed.includes('../infrastructure/')) &&
          !filePath.endsWith('event-bus.ts')
        ) {
          violations.push({ file: path.relative(process.cwd(), filePath), line: trimmed })
        }
      })
    })

    expect(violations, `Domain purity violation: Infrastructure imported inside src/domains!\n${JSON.stringify(violations, null, 2)}`).toEqual([])
  })
})
