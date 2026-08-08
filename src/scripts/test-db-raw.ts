import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../payload.config'

async function run() {
  const payload = await getPayload({ config })
  const db = payload.db as any

  console.log('--- DB Raw Query Test ---')
  const txID = await db.beginTransaction()
  console.log('Transaction ID:', txID)

  try {
    const session = db.sessions[txID]
    if (session) {
      const txDb = session.db
      console.log('txDb properties:', Object.keys(txDb))
      if (txDb.session) {
        console.log('txDb.session properties:', Object.keys(txDb.session))
        if (txDb.session.client) {
          console.log('txDb.session.client properties:', Object.keys(txDb.session.client))
          // Try running a query on the transaction client!
          const result = await txDb.session.client.query('SELECT 1 as num')
          console.log('Transaction client query result:', result.rows)
        }
      }
    }
  } catch (err) {
    console.error('Error during transaction raw query:', err)
  }

  await db.rollbackTransaction(txID)
  process.exit(0)
}

run().catch(err => {
  console.error(err)
  process.exit(1)
})
