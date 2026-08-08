import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../payload.config'

async function run() {
  const payload = await getPayload({ config })
  const db = payload.db as any
  console.log('DB Keys:', Object.keys(db))
  
  const txID = await db.beginTransaction()
  console.log('Transaction ID:', txID)
  if (db.sessions) {
    console.log('Sessions Keys:', Object.keys(db.sessions))
    const session = db.sessions[txID]
    if (session) {
      console.log('Session keys:', Object.keys(session))
      if (session.db) {
        console.log('Session DB keys:', Object.keys(session.db))
      }
    }
  }
  await db.rollbackTransaction(txID)
  process.exit(0)
}

run().catch(err => {
  console.error(err)
  process.exit(1)
})
