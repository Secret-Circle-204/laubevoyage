import 'dotenv/config'
import { getPayload } from 'payload'
import config from '@/payload.config'

async function check() {
  const payload = await getPayload({ config })
  try {
    const prefs = await payload.find({ collection: 'payload-preferences' as any, limit: 50 })
    console.log('PREFERENCES COUNT:', prefs.totalDocs)
    for (const p of prefs.docs) {
      console.log('PREF KEY:', p.key, 'VALUE:', JSON.stringify(p.value))
    }
  } catch (e: any) {
    console.log('Error checking prefs:', e.message)
  }
  process.exit(0)
}
check()
