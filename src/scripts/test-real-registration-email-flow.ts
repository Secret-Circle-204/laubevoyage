import 'dotenv/config'
import { getPayload } from 'payload'
import configPromise from '../payload.config'
import { getDomainServices } from '../domains/factory'

async function traceRegistrationFlow() {
  console.log("=================== TRACING REAL REGISTRATION EMAIL FLOW ===================")
  const payload = await getPayload({ config: configPromise })
  const services = await getDomainServices()

  // 1. Check system settings
  const settings = await payload.findGlobal({ slug: 'system-settings' as any })
  console.log("SystemSettings emailSenderSettings:", JSON.stringify(settings.emailSenderSettings, null, 2))

  // 2. Test payload.sendEmail directly
  console.log("\n--- Testing payload.sendEmail directly ---")
  try {
    const result = await payload.sendEmail({
      to: 'test-diagnostic@laubevoyage.com',
      subject: 'Test Verification Subject',
      html: '<p>Test verification html</p>'
    })
    console.log("payload.sendEmail result:", result)
  } catch (err: any) {
    console.error("payload.sendEmail THREW ERROR:", err.message)
  }

  process.exit(0)
}

traceRegistrationFlow().catch(err => {
  console.error("Trace failed:", err)
  process.exit(1)
})
