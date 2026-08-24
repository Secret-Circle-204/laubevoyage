import 'dotenv/config'
import { getPayload } from 'payload'
import configPromise from '@/payload.config'
import { ExperienceDetailsLoader } from '@/application/experience/loaders-details'
import { getExperienceSlotsWithSummaryAction } from '@/application/actions/slot-management-actions'

async function main() {
  const payload = await getPayload({ config: configPromise })

  console.log('=== 1. VERIFY EXPERIENCE #135 DURATION IN DB ===')
  const exp135 = await payload.findByID({
    collection: 'experiences',
    id: 135,
    depth: 0,
  })
  console.log('Experience #135 Title:', exp135.title)
  console.log('Experience #135 Duration:', JSON.stringify(exp135.duration))

  console.log('\n=== 2. VERIFY CUSTOMER READ MODEL FOR EXPERIENCE #135 ===')
  const customerDTO = await ExperienceDetailsLoader.loadBySlug('cairo-nile-express-3-days-fixed')
  if (customerDTO && customerDTO.bookability.model === 'fixed_package') {
    console.log('Bookable Departure Slots exposed to customer count:', customerDTO.departureSlots.length)
    console.log('Dates exposed:', customerDTO.departureSlots.map(s => `${s.departureDate} (ID: ${s.id}, Slot: ${s.departureId})`))
  } else {
    console.log('Customer DTO model:', customerDTO?.bookability.model)
  }

  console.log('\n=== 3. VERIFY ADMIN CONTROL SURFACE FOR EXPERIENCE #135 ===')
  const adminRes135 = await getExperienceSlotsWithSummaryAction(135)
  console.log('Admin Action #135 Success:', adminRes135.success)
  console.log('Admin Action #135 Summary:', JSON.stringify(adminRes135.summary, null, 2))
  console.log('Admin Action #135 Slots:', adminRes135.slots?.map(s => `${s.date} ${s.startTime} => Lifecycle: ${s.lifecycleStatus}, Corrupted: ${s.isCorrupted}`))

  console.log('\n=== 4. VERIFY ADMIN CONTROL SURFACE FOR EXPERIENCE #137 (LEGACY #187) ===')
  const adminRes137 = await getExperienceSlotsWithSummaryAction(137)
  console.log('Admin Action #137 Success:', adminRes137.success)
  console.log('Admin Action #137 Summary:', JSON.stringify(adminRes137.summary, null, 2))
  console.log('Admin Action #137 Slots:', adminRes137.slots?.map(s => `${s.date} ${s.startTime} => Lifecycle: ${s.lifecycleStatus}, Corrupted: ${s.isCorrupted}, Reason: ${s.corruptionReason || 'none'}`))

  process.exit(0)
}

main().catch((err) => {
  console.error('Fatal verification error:', err)
  process.exit(1)
})
