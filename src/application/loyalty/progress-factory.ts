import { LoyaltyTier } from '@/types'
import { TierPolicy } from '@/domains/loyalty/tier-policy'
import { LoyaltyProgramConfig } from '@/domains/loyalty/tier-config'
import { LocalizationService } from '@/domains/localization/service'
import { LocaleContext } from '@/types/locale'
import type { ConvertedPrice } from '@/domains/currency/types'
import type { PointsValueGuideDTO } from './dto'
import type { LoyaltyService } from '@/domains/loyalty/service'
import type { CurrencyService } from '@/domains/currency/service'
import type { PricingFacade } from '@/domains/currency/facade'

export interface LoyaltyProgressPresentationDTO {
  nextTierProgressPercent: number
  remainingQualifyingSpendEGP: number | null
  formattedRemainingQualifyingSpend: string | null
  nextTierName: string
  progressText: string
}

export interface LoyaltyValuationPresentationDTO {
  pointsMonetaryValue: ConvertedPrice
  pointsValuesAllCurrencies: ConvertedPrice[]
  pointsValueGuide: PointsValueGuideDTO
}

export class LoyaltyProgressDTOFactory {
  static async build(
    totalSpentEGP: number,
    currentTier: LoyaltyTier,
    loyaltyConfig: LoyaltyProgramConfig,
    localization: LocalizationService,
    ctx: LocaleContext,
  ): Promise<LoyaltyProgressPresentationDTO> {
    // 1. Single source of business rules calculation via TierPolicy
    const tierProgress = TierPolicy.getTierProgress(
      totalSpentEGP,
      currentTier,
      loyaltyConfig
    )

    // 2. Format the remaining qualifying spend price
    const formattedRemaining = tierProgress.remainingQualifyingSpendEGP !== null
      ? await localization.formatPrice(tierProgress.remainingQualifyingSpendEGP, ctx)
      : null
    const formattedRemainingQualifyingSpend = formattedRemaining ? formattedRemaining.formatted : null

    // 3. Resolve the next tier display name from config (no hardcoding of tier names)
    const nextTierConfig = tierProgress.nextTier
      ? loyaltyConfig.tiers.find((t) => t.tier.toLowerCase() === tierProgress.nextTier!.toLowerCase())
      : null

    let nextTierName = ''
    if (nextTierConfig) {
      nextTierName = await localization.translateText(nextTierConfig.label, ctx)
    } else {
      nextTierName = localization.translateUiKey('loyalty.progress.maxTier', ctx)
    }

    // 4. Translate presentation progress string
    const remainingTextKey = tierProgress.remainingQualifyingSpendEGP !== null && tierProgress.remainingQualifyingSpendEGP > 0
      ? 'loyalty.progress.remainingToTier'
      : 'loyalty.progress.maxTier'

    const progressText = localization.translateUiKey(remainingTextKey, ctx)
      .replace('{amount}', formattedRemainingQualifyingSpend || '')
      .replace('{tier}', nextTierName)

    return {
      nextTierProgressPercent: tierProgress.percent,
      remainingQualifyingSpendEGP: tierProgress.remainingQualifyingSpendEGP,
      formattedRemainingQualifyingSpend,
      nextTierName,
      progressText,
    }
  }

  static async buildValuation(
    points: number,
    loyaltyService: LoyaltyService,
    loyaltyConfig: LoyaltyProgramConfig,
    currencyService: CurrencyService,
    pricingFacade: PricingFacade,
    localization: LocalizationService,
    ctx: LocaleContext,
  ): Promise<LoyaltyValuationPresentationDTO> {
    // 1. Authoritative Domain Single Source of Truth for Points to Base EGP calculation
    const baseValueEGP = await loyaltyService.calculatePointValueInEGP(points, loyaltyConfig)

    // 2. Convert & format for customer's primary display currency
    const pointsMonetaryValue = await localization.formatPrice(baseValueEGP, ctx)

    // 3. Convert across all active CMS currencies in parallel
    const activeCurrencies = await currencyService.getActiveCurrencies()
    const pointsValuesAllCurrencies = await Promise.all(
      activeCurrencies.map((c) =>
        pricingFacade.getConvertedPrice(baseValueEGP, c.isoCode, ctx.language || 'en')
      )
    )

    // 4. Formatted unit text for guide
    const formattedRedemption = await localization.formatPrice(loyaltyConfig.redemptionValueEGP, ctx)
    const unitText = `${loyaltyConfig.redemptionPointsUnit} Pts = ${formattedRedemption.formatted}`

    // 5. Retrieve dynamic localized guide texts from dictionary
    const title = localization.translateUiKey('loyalty.guide.title', ctx)
    const description = localization.translateUiKey('loyalty.guide.description', ctx)

    return {
      pointsMonetaryValue,
      pointsValuesAllCurrencies,
      pointsValueGuide: {
        title,
        description,
        unitText,
      },
    }
  }
}
