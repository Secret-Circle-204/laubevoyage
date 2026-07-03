import Stripe from 'stripe'

// ✅ استخدام متغير بيئة صارم مع معالجة الخطأ في وقت مبكر
const stripeSecretKey = process.env.STRIPE_SECRET_KEY

if (!stripeSecretKey && process.env.NODE_ENV === 'production') {
  throw new Error('STRIPE_SECRET_KEY is missing in production environment!')
}

export const stripe = new Stripe(stripeSecretKey || 'sk_test_placeholder', {
  apiVersion: '2025-12-15.clover', // تأكد من مطابقة الإصدار في Stripe Dashboard
  typescript: true,
})

// ✅ تعريف الـ Metadata بشكل صارم ومتوافق مع Stripe
interface CheckoutMetadata {
  bookingId: string
  userId?: string
  userName?: string
  packageId?: string
  packageTitle?: string
  originalPrice?: string
  discountApplied?: string
  discountCode?: string
  pointsToRedeem?: string // نقاط الولاء المستبدلة
  travelDate?: string
  holdExpiry?: string
}

interface CreateSessionParams {
  bookingId: string
  packageTitle: string
  totalPrice: number
  customerEmail?: string | null // البريد قد يكون null من قاعدة البيانات
  successUrl: string
  cancelUrl: string
  metadata?: CheckoutMetadata
  couponId?: string // كوبون الخصم من نظام الولاء
}

/**
 * إنشاء جلسة الدفع باحترافية
 * تشمل التحقق من البيانات وتحويل العملات بدقة
 */
export async function createCheckoutSession({
  bookingId,
  packageTitle,
  totalPrice,
  customerEmail,
  successUrl,
  cancelUrl,
  metadata,
  couponId,
}: CreateSessionParams) {
  // ✅ الاحترافية: التحقق من وجود سعر صالح قبل إرساله لـ Stripe
  if (totalPrice <= 0) {
    throw new Error('Total price must be greater than zero')
  }

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'payment',
    // ✅ الحل الأفضل: إذا كان البريد null، نتركه undefined ليقوم المستخدم بإدخاله في صفحة Stripe
    customer_email: customerEmail || undefined,
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: packageTitle,
            description: `Booking #${bookingId} - L'Aube Voyage`,
            images: ['https://laubevoyage.com/logo.png'],
          },
          unit_amount: Math.round(totalPrice * 100), // تحويل دقيق للسنتات
        },
        quantity: 1,
      },
    ],
    // ✅ تطبيق الكوبون إذا متوفر
    ...(couponId && { discounts: [{ coupon: couponId }] }),
    metadata: {
      ...metadata,
      bookingId, // ضمان وجود المعرف الأساسي دائماً
    },
    // ✅ الأمان: تنتهي الجلسة بعد 30 دقيقة لتحرير المخزون (Inventory)
    expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
    success_url: successUrl,
    cancel_url: cancelUrl,
  })

  return session
}

/**
 * التحقق من صحة الـ Webhook
 * استخدام الـ Error Logging المحترف للتشخيص
 */
export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string,
  endpointSecret: string,
) {
  try {
    return stripe.webhooks.constructEvent(payload, signature, endpointSecret)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    // ✅ تسجيل الخطأ في بيئة التطوير فقط لعدم تسريب معلومات أمنية في الإنتاج
    if (process.env.NODE_ENV !== 'production') {
      console.error('⚠️ Stripe Webhook Error:', message)
    }
    return null
  }
}

// import Stripe from 'stripe'

// // Initialize Stripe with API key
// // Use a placeholder if missing to prevent build crashes
// export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
//   apiVersion: '2025-12-15.clover',
//   typescript: true,
// })

// // Extended metadata interface
// interface CheckoutMetadata {
//   [key: string]: string | undefined
//   bookingId: string
//   userId?: string
//   userName?: string
//   packageId?: string
//   packageTitle?: string
//   originalPrice?: string
//   discountApplied?: string
//   discountCode?: string
//   travelDate?: string
//   holdExpiry?: string
// }

// // Helper to create checkout session for a booking
// export async function createCheckoutSession({
//   bookingId,
//   packageTitle,
//   totalPrice,
//   customerEmail,
//   successUrl,
//   cancelUrl,
//   metadata,
// }: {
//   bookingId: string
//   packageTitle: string
//   totalPrice: number
//   customerEmail: string
//   successUrl: string
//   cancelUrl: string
//   metadata?: CheckoutMetadata
// }) {
//   const session = await stripe.checkout.sessions.create({
//     payment_method_types: ['card'],
//     mode: 'payment',
//     customer_email: customerEmail,
//     line_items: [
//       {
//         price_data: {
//           currency: 'usd',
//           product_data: {
//             name: packageTitle,
//             description: `Booking #${bookingId} - L'Aube Voyage`,
//             images: ['https://laubevoyage.com/logo.png'], // Brand logo in checkout
//           },
//           unit_amount: Math.round(totalPrice * 100), // Convert to cents
//         },
//         quantity: 1,
//       },
//     ],
//     // ✅ Enhanced metadata for Stripe Dashboard
//     metadata: (metadata || { bookingId }) as Stripe.Metadata,
//     // Checkout session options
//     expires_at: Math.floor(Date.now() / 1000) + 30 * 60, // Session expires in 30 minutes
//     success_url: successUrl,
//     cancel_url: cancelUrl,
//     // Enable automatic tax collection (optional)
//     // automatic_tax: { enabled: true },
//   })

//   return session
// }

// // Verify webhook signature - CRITICAL for security
// export function verifyWebhookSignature(
//   payload: string | Buffer,
//   signature: string,
//   endpointSecret: string,
// ) {
//   try {
//     return stripe.webhooks.constructEvent(payload, signature, endpointSecret)
//   } catch (err: unknown) {
//     const message = err instanceof Error ? err.message : 'Unknown error'
//     console.error('⚠️ Webhook signature verification failed:', message)
//     return null
//   }
// }
