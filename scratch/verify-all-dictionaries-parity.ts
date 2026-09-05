import fs from 'fs'
import path from 'path'

const dir = path.join(process.cwd(), 'src', 'dictionaries')
const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'))

const enContent = JSON.parse(fs.readFileSync(path.join(dir, 'en.json'), 'utf-8'))

function getFlatKeys(obj: Record<string, any>, prefix = ''): string[] {
  let keys: string[] = []
  for (const [k, v] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${k}` : k
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      keys = keys.concat(getFlatKeys(v, fullKey))
    } else {
      keys.push(fullKey)
    }
  }
  return keys
}

const enKeys = getFlatKeys(enContent).sort()
console.log(`Total EN dictionary keys: ${enKeys.length}`)

let hasErrors = false

for (const file of files) {
  const content = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf-8'))
  const keys = getFlatKeys(content).sort()

  const missing = enKeys.filter(k => !keys.includes(k))
  const extra = keys.filter(k => !enKeys.includes(k))

  if (missing.length > 0 || extra.length > 0) {
    console.error(`❌ Parity failure in ${file}: missing ${missing.length}, extra ${extra.length}`)
    if (missing.length > 0) console.error(`  Missing:`, missing)
    if (extra.length > 0) console.error(`  Extra:`, extra)
    hasErrors = true
  } else {
    console.log(`✅ ${file}: 100% key parity (${keys.length} keys)`)
  }
}

if (hasErrors) {
  process.exit(1)
} else {
  console.log('ALL 13 DICTIONARIES HAVE 100% KEY PARITY!')
}
