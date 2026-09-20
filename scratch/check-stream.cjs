async function check() {
  const res = await fetch('http://localhost:3000/experiences/transcontinental-grand-horizon-cairo-dubai-paris-11d')
  const html = await res.text()

  const s0Index = html.indexOf('id="S:0"')
  if (s0Index !== -1) {
    console.log('Streamed content S:0 found at:', s0Index)
    console.log(html.slice(s0Index, s0Index + 2000))
  } else {
    console.log('No S:0 found.')
    // Search for template
    const tmplIndex = html.indexOf('<div hidden="" id="S:')
    console.log('Any S: div:', tmplIndex)
    if (tmplIndex !== -1) {
      console.log(html.slice(tmplIndex, tmplIndex + 2000))
    }
  }
}

check().catch(console.error)
