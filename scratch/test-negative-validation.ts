import 'dotenv/config'

async function testNegativeValidation() {
  console.log('[Negative Validation Test] Testing Payload REST validation boundary...')
  
  // First login to get admin cookie or token if required, or check access
  // Let's test with local fetch to http://localhost:3000
  const loginRes = await fetch('http://localhost:3000/api/users/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@laubevoyage.com',
      password: 'Admin@123',
    }),
  })

  const loginData = await loginRes.json()
  const authHeader = 'JWT ' + loginData.token
  console.log('[Negative Validation Test] Authenticated as:', loginData.user?.email)

  // Attempt to submit duplicate double room rates
  const invalidPayload = {
    accommodations: [
      {
        order: 1,
        nights: 3,
        options: [
          {
            property: 1,
            pricingUnit: 'per_stay',
            roomRates: [
              { occupancy: 'double', rateEGP: 5000, enabled: true },
              { occupancy: 'double', rateEGP: 3000, enabled: true },
            ],
          },
        ],
      },
    ],
  }

  const patchRes = await fetch('http://localhost:3000/api/experiences/1955', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: authHeader,
    },
    body: JSON.stringify(invalidPayload),
  })

  const status = patchRes.status
  const body = await patchRes.json().catch(() => null)

  console.log('[Negative Validation Test] HTTP Response Status:', status)
  console.log('[Negative Validation Test] Response Body:', JSON.stringify(body, null, 2))

  if (status === 400 && JSON.stringify(body).includes('duplicate room rate for occupancy')) {
    console.log('✅ NEGATIVE VALIDATION TEST PASSED: Payload rejected invalid duplicate accommodation with HTTP 400!')
  } else {
    console.error('❌ NEGATIVE VALIDATION TEST FAILED:', { status, body })
  }
}

testNegativeValidation().catch(console.error)
