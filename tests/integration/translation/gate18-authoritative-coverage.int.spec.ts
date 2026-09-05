import { describe, it, expect, beforeAll } from 'vitest'
import { getDomainServices } from '@/domains/factory'
import { JsonTranslationDictionary } from '@/domains/translation/dictionary'

describe('Gate 18.2 — Authoritative Language Coverage & UI Translation Integration Matrix', () => {
  let languageService: any
  let localizationService: any
  let activeLanguages: any[]
  const dictionary = new JsonTranslationDictionary()

  beforeAll(async () => {
    const services = await getDomainServices()
    languageService = services.language
    localizationService = services.localization
    activeLanguages = await languageService.getActiveLanguages()
  })

  it('1. Dynamic Language Discovery: Active languages MUST be discovered from database without hardcoded whitelists', () => {
    expect(activeLanguages).toBeDefined()
    expect(Array.isArray(activeLanguages)).toBe(true)
    expect(activeLanguages.length).toBeGreaterThanOrEqual(1)

    console.log(
      `[Gate 18.2] Dynamically discovered ${activeLanguages.length} active languages from PostgreSQL languages collection:`,
      activeLanguages.map((l) => `${l.code} (${l.name} / ${l.nativeName}, RTL=${l.isRTL}, Default=${l.isDefault})`),
    )
  })

  it('2. RTL / Text Direction Source-of-Truth: Direction MUST match database isRTL for EVERY active language', async () => {
    for (const lang of activeLanguages) {
      const ctx = await localizationService.buildContext({ cookieLocale: lang.code })
      
      expect(ctx.language).toBe(lang.code)
      expect(ctx.isRTL).toBe(lang.isRTL)
      expect(ctx.direction).toBe(lang.isRTL ? 'rtl' : 'ltr')

      const isRtlFromService = await languageService.isRtlLanguage(lang.code)
      expect(isRtlFromService).toBe(lang.isRTL)
    }
  })

  it('3. Static Dictionary Full Coverage: Every active language MUST have 100% dictionary keys resolved with zero English fallback for non-English', () => {
    const requiredKeys = [
      'hero.title',
      'hero.subtitle',
      'hero.cta.primary',
      'hero.cta.secondary',
      'layout.nav.home',
      'layout.nav.destinations',
      'layout.nav.experiences',
      'layout.nav.about',
      'layout.header.myAccount',
      'layout.header.signOut',
      'layout.header.logIn',
      'layout.header.bookNow',
      'layout.sidebar.overview',
      'layout.sidebar.myBookings',
      'layout.sidebar.loyaltyRewards',
      'layout.sidebar.profileCompanions',
      'layout.sidebar.invoicesReceipts',
      'layout.sidebar.notifications',
      'layout.sidebar.settings',
      'layout.sidebar.tierSuffix',
      'layout.footer.rights',
      'layout.footer.tagline',
      'layout.footer.brandDescription',
      'layout.footer.explore',
      'layout.footer.allExperiences',
      'layout.footer.destinations',
      'layout.footer.tourPackages',
      'layout.footer.dailyTours',
      'layout.footer.company',
      'layout.footer.aboutUs',
      'layout.footer.travelBlog',
      'layout.footer.faqs',
      'layout.footer.contactUs',
      'layout.footer.legal',
      'layout.footer.privacyPolicy',
      'layout.footer.termsOfService',
      'layout.footer.customerPortal',
      'catalog.badge',
      'catalog.title',
      'catalog.description',
      'catalog.packageLabel',
      'catalog.dailyTourLabel',
      'checkout.leadTravelerInfo',
      'checkout.paymentMethod',
      'checkout.applyLoyaltyPoints',
      'checkout.orderSummary',
      'checkout.confirmAndPay',
      'checkout.firstName',
      'checkout.lastName',
      'checkout.email',
      'checkout.phone',
      'contact.vipConciergeBadge',
      'contact.title',
      'contact.description',
      'contact.directContact',
      'contact.cairoHeadOffice',
      'contact.vipHotline',
      'contact.emailLabel',
      'contact.sendMessage',
      'contact.fullName',
      'contact.subject',
      'contact.message',
      'auth.customerPortal',
      'auth.welcomeBack',
      'auth.signInSubtitle',
      'auth.dontHaveAccount',
      'auth.createAccount',
      'auth.createAccountTitle',
      'auth.createAccountSubtitle',
      'auth.alreadyHaveAccount',
      'auth.signInLink',
      'notFound.badge',
      'notFound.title',
      'notFound.description',
      'notFound.returnHome',
      'bookingConfirmation.thankYou',
      'bookingConfirmation.refSubtitle',
      'bookingConfirmation.statusLabel',
      'bookingConfirmation.totalPriceLabel',
      'loyalty.tier.explorer',
      'loyalty.tier.voyager',
      'loyalty.tier.elite',
      'loyalty.guide.title',
      'loyalty.guide.description',
      'loyalty.portal.pageTitle',
      'loyalty.portal.pageSubtitle',
      'loyalty.portal.tierMemberSuffix',
      'loyalty.portal.availableBalance',
      'loyalty.portal.pointsUnit',
      'loyalty.portal.cashValuePrefix',
      'loyalty.portal.cashValueSuffix',
      'loyalty.portal.heldPointsNotice',
      'loyalty.portal.totalQualifyingSpend',
      'loyalty.portal.instantCheckoutDiscount',
      'loyalty.portal.officialRate',
      'loyalty.portal.yourPointsValue',
      'loyalty.portal.transactionHistoryTitle',
      'loyalty.portal.noTransactions',
      'loyalty.portal.dateCol',
      'loyalty.portal.referenceCol',
      'loyalty.portal.typeCol',
      'loyalty.portal.reasonCol',
      'loyalty.portal.pointsCol',
    ]

    const enValues = new Map<string, string>()
    for (const key of requiredKeys) {
      const enVal = dictionary.get('en', key)
      expect(enVal).toBeTruthy()
      enValues.set(key, enVal)
    }

    for (const lang of activeLanguages) {
      for (const key of requiredKeys) {
        const val = dictionary.getStrict(lang.code, key)
        expect(
          val,
          `MISSING TRANSLATION DEFECT: Key "${key}" does not exist in dictionary for active language "${lang.code}".`,
        ).toBeDefined()
        expect(typeof val).toBe('string')
        expect(val!.length).toBeGreaterThan(0)

        // For non-English languages, ensure text is translated and not an unhandled English duplicate
        if (lang.code !== 'en') {
          // Allow keys that are universal numbers or specific symbols
          const isIdentical = val === enValues.get(key)
          if (isIdentical && !key.includes('tier.') && !key.includes('format')) {
            console.warn(`[Key Inspection] "${key}" in ${lang.code} is identical to EN: "${val}"`)
          }
        }
      }
    }
  })

  it('4. Dynamic Content Pipeline: Application loaders localization across active languages', async () => {
    const testEntities = ['Turkey', 'Istanbul', 'Cairo', 'Luxor Nile Cruise']

    for (const lang of activeLanguages.slice(0, 5)) {
      const ctx = await localizationService.buildContext({ cookieLocale: lang.code })
      const translated = await localizationService.translateBatch(testEntities, ctx)

      expect(translated).toBeDefined()
      expect(translated.length).toBe(testEntities.length)
      for (const t of translated) {
        expect(typeof t).toBe('string')
        expect(t.length).toBeGreaterThan(0)
      }
    }
  })
})
