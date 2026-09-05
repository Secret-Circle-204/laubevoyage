import fs from 'fs'
import path from 'path'

const dir = path.join(process.cwd(), 'src', 'dictionaries')
const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'))

console.log(`Found ${files.length} dictionary files.`)
for (const file of files) {
  const content = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf-8'))
  console.log(`${file}: bookingConfirmation keys:`, Object.keys(content.bookingConfirmation || {}))
}
