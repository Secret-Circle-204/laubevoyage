async function check() {
  const res = await fetch('http://localhost:3000/experiences/transcontinental-grand-horizon-cairo-dubai-paris-11d')
  console.log('Status:', res.status)
  const html = await res.text()
  console.log('HTML length:', html.length)

  // Check section titles
  const sections = ['stay-dossier', 'journey-summary', 'journey-itinerary', 'provisions-ledger']
  for (const s of sections) {
    console.log(`Has section #${s}:`, html.includes(s))
  }

  // Look for any accommodation words
  const words = ['Four Seasons', 'George V', 'Alexandria', 'San Stefano', 'Classic Room', 'Hotel', 'Accommodation', 'accommodations']
  for (const w of words) {
    console.log(`Has word "${w}":`, html.includes(w))
  }

  // If stay-dossier is false, search for where it fails
  if (!html.includes('stay-dossier')) {
    console.log('Why is stay-dossier missing? Checking if page returned notFound or error...')
    if (html.includes('404') || html.includes('not found')) {
      console.log('Page might be 404!')
    }
  }
}

check().catch(console.error)
