import { NextResponse } from 'next/server'
import { processBookingLifecycle } from '@/services/maintenance'

/**
 * API Route لتشغيل نظام صيانة الحجوزات برمجياً
 * يمكن استدعاؤه عبر Vercel Cron or any Cron Service
 */
export async function GET(request: Request) {
  // التحقق من مفتاح الأمان للحماية
  const { searchParams } = new URL(request.url)
  const authHeader = request.headers.get('Authorization')
  const secret = searchParams.get('secret') || authHeader?.replace('Bearer ', '')

  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'غير مصرح لك بالوصول (Unauthorized)' }, { status: 401 })
  }

  try {
    const result = await processBookingLifecycle()

    if (result.success) {
      return NextResponse.json({
        message: 'تمت عملية الصيانة بنجاح (Maintenance completed)',
        processed: result,
      })
    } else {
      return NextResponse.json(
        { error: 'فشلت العملية (Process failed)', details: result.error },
        { status: 500 },
      )
    }
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}
