import { describe, it, expect } from 'vitest'
import { NotificationTemplateEngine } from '@/domains/notification/template-engine'

describe('NotificationTemplateEngine Unit Tests', () => {
  it('should render welcome_email template in en and ar', () => {
    const en = NotificationTemplateEngine.renderTemplate('welcome_email', { name: 'Mazen' }, 'en')
    expect(en.subject).toContain("Welcome")
    expect(en.body).toContain("Mazen")

    const ar = NotificationTemplateEngine.renderTemplate('welcome_email', { name: 'مازن' }, 'ar')
    expect(ar.subject).toContain("مرحباً")
    expect(ar.body).toContain("مازن")
  })

  it('should render booking_confirmation template', () => {
    const res = NotificationTemplateEngine.renderTemplate(
      'booking_confirmation',
      { bookingNumber: 'LBV-260819-12345', customerName: 'Ahmed' },
      'en',
    )
    expect(res.subject).toContain('LBV-260819-12345')
    expect(res.body).toContain('Ahmed')
  })

  it('should render payment_receipt template', () => {
    const res = NotificationTemplateEngine.renderTemplate(
      'payment_receipt',
      { amount: 5000, currency: 'EGP' },
      'en',
    )
    expect(res.subject).toBe('Payment Receipt')
    expect(res.body).toContain('5000 EGP')
  })

  it('should render tier_upgraded template', () => {
    const res = NotificationTemplateEngine.renderTemplate(
      'tier_upgraded',
      { newTier: 'gold', bonusGranted: 500 },
      'en',
    )
    expect(res.subject).toContain('GOLD')
    expect(res.body).toContain('500 bonus points')
  })

  it('should render loyalty_earned template in en and ar', () => {
    const en = NotificationTemplateEngine.renderTemplate(
      'loyalty_earned',
      { points: 250, balance: 1250 },
      'en',
    )
    expect(en.subject).toBe('You earned 250 loyalty points!')
    expect(en.body).toContain('250 new loyalty points')
    expect(en.body).toContain('1250 points')

    const ar = NotificationTemplateEngine.renderTemplate(
      'loyalty_earned',
      { points: 250, balance: 1250 },
      'ar',
    )
    expect(ar.subject).toBe('تمت إضافة 250 نقطة ولاء إلى حسابك')
    expect(ar.body).toContain('250 نقطة ولاء جديدة')
    expect(ar.body).toContain('1250 نقطة')
  })

  it('should throw for unhandled templateId', () => {
    expect(() =>
      NotificationTemplateEngine.renderTemplate('unknown_template', {}, 'en'),
    ).toThrow(/Unsupported or unhandled templateId/)
  })
})
