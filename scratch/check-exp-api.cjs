const fetchExp = async () => {
  const loginRes = await fetch('http://localhost:3000/api/users/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@laubevoyage.com', password: 'Admin@123' }),
  })
  const loginData = await loginRes.json()
  const authHeader = 'JWT ' + loginData.token

  const res = await fetch('http://localhost:3000/api/experiences/1955?depth=2', {
    headers: { Authorization: authHeader },
  })
  const json = await res.json()
  console.log('Accommodations on #1955:', JSON.stringify(json.accommodations, null, 2))
}

fetchExp().catch(console.error)
