import 'dotenv/config'
import { getPayload } from 'payload'
import config from '@payload-config'

async function inspectSession() {
  const payload = await getPayload({ config })
  const dbAdapter = payload.db as any

  console.log('=== STARTING TEST TRANSACTION ===')
  const txId = await payload.db.beginTransaction()
  console.log('txId:', txId)
  const session = dbAdapter.sessions[txId as string]
  console.log('session keys:', Object.keys(session))
  console.log('session.db type:', typeof session.db)
  console.log('session.db constructor:', session.db?.constructor?.name)
  console.log('session.db keys:', Object.keys(session.db))
  console.log('has session.db.execute:', typeof session.db?.execute)
  console.log('has session.db.session:', typeof session.db?.session)
  console.log('has session.db.session.client:', typeof session.db?.session?.client)
  console.log('session.db.session.client keys:', session.db?.session?.client ? Object.keys(session.db.session.client) : null)

  await payload.db.rollbackTransaction(txId)
  console.log('=== ROLLED BACK ===')
  process.exit(0)
}

inspectSession().catch(e => {
  console.error(e)
  process.exit(1)
})
