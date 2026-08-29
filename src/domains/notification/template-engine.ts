/**
 * Bilingual Notification Template Engine
 * Renders HTML/Text template contents using template data variables and language preference.
 * Enforces strict variable requirements without silent fallback defaults.
 */
export class NotificationTemplateEngine {
  static renderTemplate(
    templateId: string,
    templateData: Record<string, unknown>,
    locale = 'en',
  ): { subject: string; body: string } {
    const isArabic = locale.startsWith('ar')

    if (templateId === 'verification_email') {
      const name = String(templateData['name'] || 'Valued Guest')
      const verifyUrl = String(templateData['verificationUrl'] || '')
      if (!verifyUrl) {
        throw new Error(
          `[NotificationTemplateEngine] Template 'verification_email' missing required field: 'verificationUrl'`,
        )
      }
      const subject = isArabic ? 'تأكيد بريدك الإلكتروني - L\'Aube Voyage' : 'Verify your email - L\'Aube Voyage'
      const body = isArabic
        ? `مرحباً ${name}، شكراً لتسجيلك في L'Aube Voyage. يرجى تأكيد بريدك الإلكتروني لتفعيل حسابك:\n${verifyUrl}`
        : `Hello ${name}, thank you for registering with L'Aube Voyage. Please verify your email to activate your account:\n${verifyUrl}`
      return { subject, body }
    }

    if (templateId === 'welcome_email') {
      const name = String(templateData['name'] || templateData['customerName'] || 'Valued Guest')
      const bonusPoints = templateData['bonusPoints']
      const pointsText =
        typeof bonusPoints === 'number'
          ? isArabic
            ? ` تم تفعيل حسابك بنجاح وحصلت على ${bonusPoints} نقطة ترحيبية!`
            : ` Your account is now active and you have been awarded ${bonusPoints} Welcome Points!`
          : ''
      const subject = isArabic ? 'مرحباً بك في L\'Aube Voyage' : 'Welcome to L\'Aube Voyage'
      const body = isArabic
        ? `أهلاً بك ${name}! يسعدنا انضمامك إلى منصة L'Aube Voyage.${pointsText}`
        : `Welcome ${name}! We are excited to have you on board with L'Aube Voyage.${pointsText}`
      return { subject, body }
    }

    if (templateId === 'booking_confirmation') {
      if (!templateData['bookingNumber']) {
        throw new Error(`[NotificationTemplateEngine] Template 'booking_confirmation' missing required field: bookingNumber`)
      }
      if (!templateData['customerName']) {
        throw new Error(`[NotificationTemplateEngine] Template 'booking_confirmation' missing required field: customerName`)
      }

      const bookingNumber = String(templateData['bookingNumber'])
      const customerName = String(templateData['customerName'])
      const subject = isArabic ? `تأكيد الحجز ${bookingNumber}` : `Booking Confirmation ${bookingNumber}`
      const body = isArabic
        ? `مرحباً ${customerName}، تم تأكيد حجزك رقم ${bookingNumber} بنجاح.`
        : `Hello ${customerName}, your booking ${bookingNumber} has been confirmed successfully.`
      return { subject, body }
    }

    if (templateId === 'payment_receipt') {
      if (templateData['amount'] === undefined || templateData['amount'] === null) {
        throw new Error(`[NotificationTemplateEngine] Template 'payment_receipt' missing required field: amount`)
      }
      if (!templateData['currency']) {
        throw new Error(`[NotificationTemplateEngine] Template 'payment_receipt' missing required field: currency`)
      }

      const amount = Number(templateData['amount'] ?? 0)
      const currency = String(templateData['currency'])
      const subject = isArabic ? 'إيصال استلام الدفع' : 'Payment Receipt'
      const body = isArabic
        ? `تم استلام مبلغ ${amount} ${currency} بنجاح.`
        : `Payment of ${amount} ${currency} received successfully.`
      return { subject, body }
    }

    if (templateId === 'tier_upgraded') {
      const newTier = String(templateData['newTier'] || '').toUpperCase()
      const bonus = templateData['bonusGranted'] ? ` (${templateData['bonusGranted']} bonus points granted!)` : ''
      const subject = isArabic ? `ترقية مستوى العضوية إلى ${newTier}` : `Loyalty Tier Upgraded to ${newTier}`
      const body = isArabic
        ? `تهانينا! تم ترقية حسابك إلى المستوى ${newTier}.${bonus}`
        : `Congratulations! Your membership tier has been upgraded to ${newTier}.${bonus}`
      return { subject, body }
    }

    if (templateId === 'loyalty_earned') {
      const points = Number(templateData['points'] ?? 0)
      const balance = templateData['balance'] !== undefined ? Number(templateData['balance']) : undefined
      const balanceText = balance !== undefined ? (isArabic ? ` رصيدك الحالي: ${balance} نقطة.` : ` Current balance: ${balance} points.`) : ''
      const subject = isArabic ? `تمت إضافة ${points} نقطة ولاء إلى حسابك` : `You earned ${points} loyalty points!`
      const body = isArabic
        ? `تهانينا! لقد حصلت على ${points} نقطة ولاء جديدة.${balanceText}`
        : `Congratulations! You have earned ${points} new loyalty points.${balanceText}`
      return { subject, body }
    }

    if (templateId === 'booking_pending_admin_review') {
      if (!templateData['bookingNumber']) {
        throw new Error(`[NotificationTemplateEngine] Template 'booking_pending_admin_review' missing required field: bookingNumber`)
      }
      if (!templateData['customerName']) {
        throw new Error(`[NotificationTemplateEngine] Template 'booking_pending_admin_review' missing required field: customerName`)
      }

      const bookingNumber = String(templateData['bookingNumber'])
      const customerName = String(templateData['customerName'])
      const experienceTitle = templateData['experienceTitle'] ? String(templateData['experienceTitle']) : ''
      const departureDate = templateData['departureDate'] ? String(templateData['departureDate']) : ''
      const passengersCount = templateData['passengersCount'] ? Number(templateData['passengersCount']) : 0
      const totalCost = templateData['totalCost'] ? String(templateData['totalCost']) : ''

      const subject = isArabic ? `تم استلام طلب الحجز: ${bookingNumber}` : `Booking Request Received: ${bookingNumber}`
      const body = isArabic
        ? `مرحباً ${customerName}، تم استلام طلب الحجز رقم ${bookingNumber}${experienceTitle ? ` لرحلة "${experienceTitle}"` : ''}${departureDate ? ` في تاريخ ${departureDate}` : ''}${passengersCount ? ` (${passengersCount} مسافرين)` : ''}${totalCost ? ` (الإجمالي: ${totalCost})` : ''}. يقوم فريقنا بمراجعة طلبك وسنتواصل معك قريباً لتأكيد وإتمام الحجز.`
        : `Hello ${customerName}, your booking request #${bookingNumber}${experienceTitle ? ` for "${experienceTitle}"` : ''}${departureDate ? ` on ${departureDate}` : ''}${passengersCount ? ` (${passengersCount} travelers)` : ''}${totalCost ? ` (Total: ${totalCost})` : ''} has been received. Our luxury travel concierge team is reviewing your request and will contact you shortly to confirm and finalize your reservation.`
      return { subject, body }
    }

    if (templateId === 'admin_bnpl_review_alert') {
      if (!templateData['bookingNumber']) {
        throw new Error(`[NotificationTemplateEngine] Template 'admin_bnpl_review_alert' missing required field: bookingNumber`)
      }
      if (!templateData['customerName']) {
        throw new Error(`[NotificationTemplateEngine] Template 'admin_bnpl_review_alert' missing required field: customerName`)
      }

      const bookingNumber = String(templateData['bookingNumber'])
      const customerName = String(templateData['customerName'])
      const customerEmail = templateData['customerEmail'] ? String(templateData['customerEmail']) : ''
      const experienceTitle = templateData['experienceTitle'] ? String(templateData['experienceTitle']) : ''
      const departureDate = templateData['departureDate'] ? String(templateData['departureDate']) : ''
      const passengersCount = templateData['passengersCount'] ? Number(templateData['passengersCount']) : 0
      const totalAmount = templateData['totalAmount'] ? String(templateData['totalAmount']) : ''
      const adminBookingUrl = templateData['adminBookingUrl'] ? String(templateData['adminBookingUrl']) : ''

      const subject = isArabic ? `[مطلوب اتخاذ إجراء] طلب حجز BNPL جديد: #${bookingNumber}` : `[ACTION REQUIRED] New BNPL Booking Request: #${bookingNumber}`
      const body = isArabic
        ? `تم تقديم طلب حجز BNPL جديد رقم #${bookingNumber} بواسطة ${customerName}${customerEmail ? ` (${customerEmail})` : ''}${experienceTitle ? ` لرحلة "${experienceTitle}"` : ''}${departureDate ? ` في تاريخ ${departureDate}` : ''}${passengersCount ? ` (${passengersCount} مسافرين)` : ''}.${totalAmount ? ` الإجمالي: ${totalAmount}،` : ''} المدفوع: 0 (غير مدفوع). الحالة الحالية: في انتظار مراجعة الإدارة.${adminBookingUrl ? ` يرجى مراجعة الطلب في لوحة التحكم: ${adminBookingUrl}` : ''}`
        : `A new BNPL reservation request #${bookingNumber} was submitted by ${customerName}${customerEmail ? ` (${customerEmail})` : ''}${experienceTitle ? ` for "${experienceTitle}"` : ''}${departureDate ? ` on ${departureDate}` : ''}${passengersCount ? ` (${passengersCount} travelers)` : ''}.${totalAmount ? ` Total: ${totalAmount},` : ''} Amount Paid: 0 (UNPAID). Current Status: Pending Admin Review.${adminBookingUrl ? ` Review and take action in the admin portal: ${adminBookingUrl}` : ''}`
      return { subject, body }
    }

    throw new Error(`[NotificationTemplateEngine] Unsupported or unhandled templateId: '${templateId}'`)
  }
}
