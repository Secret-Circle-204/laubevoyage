import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

describe('Clean Architecture: Session Boundaries', () => {
  it('should ensure SessionResolver adheres to all architectural boundaries', () => {
    const resolverPath = path.resolve(__dirname, '../../src/application/auth/session-resolver.ts')
    const content = fs.readFileSync(resolverPath, 'utf-8')

    // 1. Prohibit direct imports of Payload generated infrastructure types
    expect(content).not.toContain('@/payload-types')

    // 2. Prohibit imports from loyalty domain
    expect(content).not.toContain('@/domains/loyalty')
    expect(content).not.toContain('../loyalty')

    // 3. Prohibit calling getProfile()
    expect(content).not.toContain('getProfile')

    // 4. Prohibit calling getCustomerBalance()
    expect(content).not.toContain('getCustomerBalance')

    // 5. Prohibit reference to point-ledger
    expect(content).not.toContain('point-ledger')
  })
})
