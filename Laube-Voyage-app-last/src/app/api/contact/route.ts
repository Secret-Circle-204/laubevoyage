import { getPayload } from 'payload'
import config from '@/payload.config'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, email, phone, subject, destination, message } = body

    // Validate required fields
    if (!name || !email || !subject || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Validate message length
    if (message.length < 50) {
      return NextResponse.json({ error: 'Message must be at least 50 characters' }, { status: 400 })
    }

    const payload = await getPayload({ config })

    // Create the inquiry
    await payload.create({
      collection: 'contact-inquiries',
      data: {
        name,
        email,
        phone: phone || '',
        subject,
        destination: destination || '',
        message,
        status: 'new',
      },
    })

    return NextResponse.json({ success: true, message: 'Inquiry submitted successfully' })
  } catch (error: unknown) {
    console.error('Contact form error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to submit inquiry'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
