import 'dotenv/config'
import { getPayload } from 'payload'
import configPromise from '../payload.config'
import { getDomainServices } from '../domains/factory'

async function traceRegister() {
  console.log("=================== TRACING EXECUTE REGISTER WORKFLOW ===================")
  const payload = await getPayload({ config: configPromise })
  const services = await getDomainServices()

  const testEmail = `test_audit_${Date.now()}@example.com`
  console.log(`Attempting registration for: ${testEmail}`)

  try {
    const customer = await services.customer.registerCustomer(
      testEmail,
      'AuditFirst',
      'AuditLast',
      'StrongPassword123!',
      { preferredLanguage: 'en', preferredCurrency: 'EGP' },
      { eventSource: 'domain' }
    )
    console.log("Registration returned customer aggregate:", {
      customerId: customer.customerId,
      email: customer.email,
      status: customer.status,
    })
  } catch (err: any) {
    console.error("registerCustomer failed:", err)
  }

  process.exit(0)
}

traceRegister().catch(err => {
  console.error("Execution failed:", err)
  process.exit(1)
})
