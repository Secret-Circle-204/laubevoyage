import { getApplicationServices } from '@/application/factory'
import { getLocaleContext } from '@/lib/get-locale-context'
import { LoyaltyTier } from '@/types'
import { TierPolicy } from '@/domains/loyalty/tier-policy'
import { LoyaltyProgressDTOFactory } from '@/application/loyalty/progress-factory'
import type { CustomerLoyaltyPortalDTO } from './dto'
import { LoyaltyProgramConfigurationException } from '@/domains/loyalty/tier-config'

export class CustomerLoyaltyLoader {
  static async load(customerId: number): Promise<CustomerLoyaltyPortalDTO> {
    try {
      const { loyalty, dashboard, localization, currency: currencyService, pricingFacade } = await getApplicationServices()
      const ctx = await getLocaleContext()

      const [authoritativeBalance, rawHistory, projection] = await Promise.all([
        loyalty.getCustomerBalance(customerId),
        loyalty.getCustomerLedgerHistory(customerId, 50),
        dashboard.getPortalOverview(customerId),
      ])

      const loyaltyConfig = await loyalty.getActiveConfig()
      const orderedTiers = TierPolicy.getOrderedTiers(loyaltyConfig)
      const defaultTier = orderedTiers[0].tier

      const totalSpentEGP = projection?.loyalty?.totalSpentEGP ?? 0
      const currentTier = (projection?.loyalty?.tier || defaultTier).toLowerCase() as LoyaltyTier

      // Delegate all tier progress calculation and formatting to the unified factory
      const progressPresentation = await LoyaltyProgressDTOFactory.build(
        totalSpentEGP,
        currentTier,
        loyaltyConfig,
        localization,
        ctx
      )

      // Delegate points monetary valuation & multi-currency calculation to the unified factory
      const valuationPresentation = await LoyaltyProgressDTOFactory.buildValuation(
        authoritativeBalance,
        loyalty,
        loyaltyConfig,
        currencyService,
        pricingFacade,
        localization,
        ctx
      )

      const tierThresholdsArray = loyalty.getTierThresholds(loyaltyConfig)

      const formattedPointsBalance = localization.formatNumber(authoritativeBalance, ctx)
      const formattedTotalSpentPrice = await localization.formatPrice(totalSpentEGP, ctx)

      const currentTierConfig = loyaltyConfig.tiers.find((t) => t.tier.toLowerCase() === currentTier.toLowerCase())
      if (!currentTierConfig) {
        throw new LoyaltyProgramConfigurationException(
          `[CustomerLoyaltyLoader] Critical config error: Customer's active tier [${currentTier}] is missing from active config.`,
        )
      }
      const translatedCurrentTier = await localization.translateText(currentTierConfig.label, ctx)

      const tierThresholds = await Promise.all(
        tierThresholdsArray.map(async (t) => {
          const formatted = await localization.formatPrice(t.minSpentEGP, ctx)
          const tierDef = loyaltyConfig.tiers.find((tc) => tc.tier.toLowerCase() === t.tier.toLowerCase())
          if (!tierDef) {
            throw new LoyaltyProgramConfigurationException(
              `[CustomerLoyaltyLoader] Critical config error: Tier [${t.tier}] is missing from active config.`,
            )
          }
          const translatedTierName = await localization.translateText(tierDef.label, ctx)
          return {
            tier: t.tier,
            minSpentEGP: t.minSpentEGP,
            formattedMinSpent: formatted.formatted,
            translatedTierName,
          }
        })
      )

      const formattedRedemption = await localization.formatPrice(loyaltyConfig.redemptionValueEGP, ctx)

      const redemptionRate = {
        pointsUnit: loyaltyConfig.redemptionPointsUnit,
        baseValue: loyaltyConfig.redemptionValueEGP,
        baseCurrency: 'EGP',
        displayValue: formattedRedemption.formatted,
      }

      const history = rawHistory.map((record) => {
        return {
          id: record.id,
          createdAt: record.createdAt,
          points: record.points,
          type: record.type,
          reason: record.reason || '',
          isPositive: record.points > 0,
        }
      })

      return {
        pointsBalance: authoritativeBalance,
        formattedPointsBalance,
        pointsMonetaryValue: valuationPresentation.pointsMonetaryValue,
        pointsValuesAllCurrencies: valuationPresentation.pointsValuesAllCurrencies,
        pointsValueGuide: valuationPresentation.pointsValueGuide,
        currentTier: currentTier as LoyaltyTier,
        translatedCurrentTier,
        redemptionRate,
        tierThresholds,
        totalSpentEGP,
        formattedTotalSpentEGP: formattedTotalSpentPrice.formatted,
        nextTierProgressPercent: progressPresentation.nextTierProgressPercent,
        remainingQualifyingSpendEGP: progressPresentation.remainingQualifyingSpendEGP,
        formattedRemainingQualifyingSpend: progressPresentation.formattedRemainingQualifyingSpend,
        nextTierName: progressPresentation.nextTierName,
        progressText: progressPresentation.progressText,
        history,
      }
    } catch (err) {
      console.error(`[CustomerLoyaltyLoader] Failed loading loyalty details for customer #${customerId}:`, err)
      throw err
    }
  }
}
