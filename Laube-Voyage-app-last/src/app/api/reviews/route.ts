import { getPayload } from 'payload'
import config from '@/payload.config'
import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import type { Where } from 'payload'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const excursionId = searchParams.get('excursion')

    const payload = await getPayload({ config })

    const query: Where = {
      status: { equals: 'approved' },
    }

    if (excursionId) {
      query.excursion = { equals: excursionId }
    }

    const reviews = await payload.find({
      collection: 'reviews',
      where: query,
      sort: '-createdAt',
      depth: 1, // Include user info
    })

    // Calculate stats
    const ratings = reviews.docs.map((r) => r.rating)
    const averageRating =
      ratings.length > 0 ? ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length : 0

    const ratingDistribution: { [key: number]: number } = {}
    ratings.forEach((r: number) => {
      ratingDistribution[r] = (ratingDistribution[r] || 0) + 1
    })

    return NextResponse.json({
      reviews: reviews.docs,
      totalReviews: reviews.totalDocs,
      averageRating,
      ratingDistribution,
    })
  } catch (error: unknown) {
    console.error('Reviews GET error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch reviews'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: await headers() })

    if (!user) {
      return NextResponse.json({ error: 'Please log in to submit a review' }, { status: 401 })
    }

    const body = await request.json()
    const { excursion, rating, title, comment, tripDate } = body

    // Validate required fields
    if (!excursion || !rating || !title || !comment) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Validate rating
    if (rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 })
    }

    // Check if user already reviewed this excursion
    const existing = await payload.find({
      collection: 'reviews',
      where: {
        and: [{ user: { equals: user.id } }, { excursion: { equals: excursion } }],
      },
    })

    if (existing.totalDocs > 0) {
      return NextResponse.json(
        { error: 'You have already reviewed this excursion' },
        { status: 400 },
      )
    }

    // Create the review
    const review = await payload.create({
      collection: 'reviews',
      data: {
        user: user.id,
        excursion,
        rating,
        title,
        comment,
        tripDate: tripDate || undefined,
        status: 'pending',
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Review submitted successfully. It will be visible after approval.',
      review,
    })
  } catch (error: unknown) {
    console.error('Reviews POST error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to submit review'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
