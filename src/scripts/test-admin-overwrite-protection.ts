import 'dotenv/config'
import { getPayload } from 'payload'
import configPromise from '../payload.config'

async function main() {
  console.log("Initializing Payload...")
  const payload = await getPayload({ config: configPromise })
  console.log("Payload initialized.")

  const customerId = 53

  console.log("\n=================== TEST CASE: Admin Overwrite Protection ===================")
  
  // Step 1: Set points to 100 via system update (overrideAccess: true is default for Local API)
  console.log("Setting customer 53's points to 100 via Local API...")
  const systemUpdateResult = await payload.update({
    collection: 'customers',
    id: customerId,
    data: {
      loyalty: {
        points: 100,
        tier: 'explorer'
      }
    }
  })
  console.log(`System Update Done. Current points: ${systemUpdateResult.loyalty?.points}`)

  if (systemUpdateResult.loyalty?.points !== 100) {
    throw new Error("❌ System update failed to set points to 100!")
  }

  // Step 2: Attempt to overwrite points to 0 simulating Admin UI save (overrideAccess: false)
  console.log("Attempting to update customer profile with stale points = 0 (overrideAccess: false)...")
  const adminUpdateResult = await payload.update({
    collection: 'customers',
    id: customerId,
    data: {
      firstName: 'TestAdminUpdate',
      loyalty: {
        points: 0,
        tier: 'explorer'
      }
    },
    req: {
      user: {
        id: customerId,
        collection: 'customers'
      }
    } as any,
    overrideAccess: false // Simulates Admin UI/API access check
  })

  console.log(`Admin Update Done. First Name: ${adminUpdateResult.firstName}, Points: ${adminUpdateResult.loyalty?.points}`)

  // Verify that the firstName was updated, but the loyalty points were NOT overwritten (remained 100)!
  if (adminUpdateResult.firstName === 'TestAdminUpdate' && adminUpdateResult.loyalty?.points === 100) {
    console.log("✅ Admin save successfully updated profile details while leaving loyalty points untouched!")
  } else {
    throw new Error(`❌ Admin save overwrote loyalty points to: ${adminUpdateResult.loyalty?.points}`)
  }

  console.log("✅ Admin Overwrite Protection test passed successfully!")
  process.exit(0)
}

main().catch((err) => {
  console.error("Test execution failed:", err)
  process.exit(1)
})
