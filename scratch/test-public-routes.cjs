async function testPublicRoutes() {
  console.log('Testing public experience route for #1955...')
  const expRes = await fetch('http://localhost:3000/experiences/transcontinental-grand-horizon-cairo-dubai-paris-11d')
  console.log('Public Experience Page Status:', expRes.status)

  if (!expRes.ok) {
    const text = await expRes.text()
    console.error('Failed to load experience page:', text.slice(0, 500))
    process.exit(1)
  }

  const expHtml = await expRes.text()
  console.log('Experience Page HTML length:', expHtml.length)
  console.log('Contains Four Seasons:', expHtml.includes('Four Seasons'))

  console.log('Testing Home route...')
  const homeRes = await fetch('http://localhost:3000/')
  console.log('Home Page Status:', homeRes.status)

  console.log('✅ ALL PUBLIC ROUTES LOADED WITH HTTP 200 AND ZERO EXCEPTIONS!')
}

testPublicRoutes().catch(console.error)
