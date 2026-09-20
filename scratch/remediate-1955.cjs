const run = async () => {
  const loginRes = await fetch('http://localhost:3000/api/users/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@laubevoyage.com', password: 'Admin@123' }),
  })
  const loginData = await loginRes.json()
  const authHeader = 'JWT ' + loginData.token

  // Fetch current 1955 experience
  const expRes = await fetch('http://localhost:3000/api/experiences/1955?depth=0', {
    headers: { Authorization: authHeader },
  })
  const exp = await expRes.json()

  console.log('[Remediation] Current stays count:', exp.accommodations?.length)

  // Build the clean, compliant accommodations array matching the exact intended state:
  const remediatedAccommodations = exp.accommodations.map((stay, stayIdx) => {
    return {
      ...stay,
      options: stay.options.map((opt, optIdx) => {
        if (stayIdx === 0 && optIdx === 0) {
          // Stay 1 / Option 1
          return {
            ...opt,
            roomRates: [
              { occupancy: 'single', rateEGP: 0, enabled: false },
              { id: '6aaec64a32039d95906bd880', occupancy: 'double', rateEGP: 5000, enabled: true },
              { occupancy: 'triple', rateEGP: 0, enabled: false },
              { occupancy: 'quad', rateEGP: 0, enabled: false },
            ],
          }
        }
        if (stayIdx === 1 && optIdx === 0) {
          // Stay 2 / Option 1
          return {
            ...opt,
            roomRates: [
              { occupancy: 'single', rateEGP: 0, enabled: false },
              { id: '6aaec64a32039d95906bd883', occupancy: 'double', rateEGP: 5000, enabled: true },
              { occupancy: 'triple', rateEGP: 0, enabled: false },
              { occupancy: 'quad', rateEGP: 0, enabled: false },
            ],
          }
        }
        return opt
      }),
    }
  })

  console.log('[Remediation] Submitting PATCH through Payload API boundary...')
  const patchRes = await fetch('http://localhost:3000/api/experiences/1955', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: authHeader,
    },
    body: JSON.stringify({
      accommodations: remediatedAccommodations,
    }),
  })

  const patchJson = await patchRes.json()
  console.log('[Remediation] PATCH status:', patchRes.status)

  if (patchRes.status === 200) {
    console.log('✅ Experience #1955 remediated successfully!')
  } else {
    console.error('❌ Remediation failed:', patchJson)
  }
}

run().catch(console.error)
