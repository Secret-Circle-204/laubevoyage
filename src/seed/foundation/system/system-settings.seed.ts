import type { Payload } from 'payload'

export interface SystemSettingsSeedResult {
  status: 'created' | 'preserved'
  baseCurrency: string
  reservationSenderEmail: string
  loyaltySenderEmail: string
}

/**
 * Seeder for SystemSettings Global runtime configuration.
 *
 * ARCHITECTURAL CONTRACT:
 * - Idempotent & Non-Destructive: If an authoritative, valid SystemSettings
 *   record already exists in the database (e.g. customized by an Administrator
 *   via the Payload Admin UI), this seeder strictly PRESERVES all existing values (NO-OP).
 * - Cold-Start Canonical Baseline: If the database is fresh, empty, or uninitialized,
 *   it creates the initial canonical baseline configuration required by the runtime
 *   and fail-fast registries (establishing mandatory baseCurrency links & verified sender identities).
 */
export async function seedSystemSettings(payload: Payload): Promise<SystemSettingsSeedResult> {
  console.log('⚙️ [Seed] Checking SystemSettings global runtime configuration...')

  // 1. Inspect existing Global document state
  let existingSettings: any = null
  try {
    existingSettings = await payload.findGlobal({
      slug: 'system-settings',
      depth: 1,
    })
  } catch (err: unknown) {
    console.log('   ⚠️ Could not read existing SystemSettings, will initialize baseline.')
  }

  const existingResSender = existingSettings?.emailSenderSettings?.reservationIdentity
  const existingLoySender = existingSettings?.emailSenderSettings?.loyaltyIdentity
  const existingBaseCurrency = existingSettings?.baseCurrency

  const isConfiguredAndHealthy = Boolean(
    existingBaseCurrency &&
    existingResSender?.fromName?.trim() &&
    existingResSender?.fromEmail?.trim() &&
    existingResSender?.replyTo?.trim() &&
    existingLoySender?.fromName?.trim() &&
    existingLoySender?.fromEmail?.trim() &&
    existingLoySender?.replyTo?.trim(),
  )

  // 2. Non-Destructive Gate: If already healthy & configured by Admin, PRESERVE!
  if (isConfiguredAndHealthy) {
    const baseCode =
      typeof existingBaseCurrency === 'object' && existingBaseCurrency?.isoCode
        ? existingBaseCurrency.isoCode
        : String(existingBaseCurrency)

    console.log(
      `🛡️ [Seed] SystemSettings already configured by Administrator (Base: ${baseCode}, Sender: ${existingResSender.fromEmail}). Preserving existing settings (NO-OP).`,
    )

    return {
      status: 'preserved',
      baseCurrency: baseCode,
      reservationSenderEmail: existingResSender.fromEmail,
      loyaltySenderEmail: existingLoySender.fromEmail,
    }
  }

  // 3. Resolve canonical base currency EGP (Mandatory Relationship)
  const egpResult = await payload.find({
    collection: 'currencies',
    where: {
      isoCode: { equals: 'EGP' },
    },
    limit: 1,
  })

  if (!egpResult.docs.length) {
    throw new Error(
      '[seedSystemSettings] Mandatory base currency EGP was not found in database. seedCurrencies must be executed before seedSystemSettings.',
    )
  }

  const egpDoc = egpResult.docs[0]
  const egpId = egpDoc.id

  console.log('📦 [Seed] Initializing Canonical Baseline for SystemSettings on fresh database...')

  // 4. Create authoritative Canonical Baseline without overwriting non-empty Admin values if partially set
  const baselineData = {
    vatRate: typeof existingSettings?.vatRate === 'number' ? existingSettings.vatRate : 0,
    pricesIncludeVat: existingSettings?.pricesIncludeVat ?? false,
    vatEnabled: existingSettings?.vatEnabled ?? false,
    baseCurrency: existingBaseCurrency
      ? typeof existingBaseCurrency === 'object'
        ? existingBaseCurrency.id
        : existingBaseCurrency
      : egpId,
    defaultDisplayCurrency: existingSettings?.defaultDisplayCurrency
      ? typeof existingSettings.defaultDisplayCurrency === 'object'
        ? existingSettings.defaultDisplayCurrency.id
        : existingSettings.defaultDisplayCurrency
      : egpId,
    autoSyncExchangeRates: existingSettings?.autoSyncExchangeRates ?? true,
    exchangeSyncInterval: existingSettings?.exchangeSyncInterval ?? 60,
    exchangeRateCacheTtl: existingSettings?.exchangeRateCacheTtl ?? 15,
    bookingNotificationEmails: existingSettings?.bookingNotificationEmails?.length
      ? existingSettings.bookingNotificationEmails
      : [{ email: 'reservation@laubevoyage.com' }],
    emailSenderSettings: {
      reservationIdentity: {
        fromName: existingResSender?.fromName?.trim() || "L'Aube Voyage Reservations",
        fromEmail: existingResSender?.fromEmail?.trim() || 'reservation@laubevoyage.com',
        replyTo: existingResSender?.replyTo?.trim() || 'reservation@laubevoyage.com',
      },
      loyaltyIdentity: {
        fromName: existingLoySender?.fromName?.trim() || "L'Aube Voyage Loyalty",
        fromEmail: existingLoySender?.fromEmail?.trim() || 'no-reply@laubevoyage.com',
        replyTo: existingLoySender?.replyTo?.trim() || 'no-reply@laubevoyage.com',
      },
      securityIdentity: {
        fromName:
          existingSettings?.emailSenderSettings?.securityIdentity?.fromName?.trim() ||
          "L'Aube Voyage Security",
        fromEmail:
          existingSettings?.emailSenderSettings?.securityIdentity?.fromEmail?.trim() ||
          'no-reply@laubevoyage.com',
        replyTo:
          existingSettings?.emailSenderSettings?.securityIdentity?.replyTo?.trim() ||
          'no-reply@laubevoyage.com',
      },
    },
  }

  await payload.updateGlobal({
    slug: 'system-settings',
    data: baselineData,
  })

  console.log('✅ [Seed] SystemSettings canonical baseline created successfully.')

  return {
    status: 'created',
    baseCurrency: 'EGP',
    reservationSenderEmail: baselineData.emailSenderSettings.reservationIdentity.fromEmail,
    loyaltySenderEmail: baselineData.emailSenderSettings.loyaltyIdentity.fromEmail,
  }
}
