import { getApplicationServices } from '@/application/factory'
import { getLocaleContext } from '@/lib/get-locale-context'
import { LoyaltyTier } from '@/types'
import { TierPolicy } from '@/domains/loyalty/tier-policy'
import { LoyaltyProgressDTOFactory } from '@/application/loyalty/progress-factory'
import type { CustomerLoyaltyPortalDTO, PublicLoyaltyConfigDTO } from './dto'
import { LoyaltyProgramConfigurationException } from '@/domains/loyalty/tier-config'

export class CustomerLoyaltyLoader {
  static async load(customerId: number, options?: { page?: number; limit?: number }): Promise<CustomerLoyaltyPortalDTO> {
    try {
      const { loyalty, dashboard, localization, currency: currencyService, pricingFacade, booking } = await getApplicationServices()
      const ctx = await getLocaleContext()
      const page = options?.page || 1
      const limit = options?.limit || 20

      const [authoritativeBalance, paginatedHistory, projection, activeHeldPoints] = await Promise.all([
        loyalty.getCustomerBalance(customerId),
        loyalty.getCustomerLedgerHistoryPaginated(customerId, { page, limit }),
        dashboard.getPortalOverview(customerId),
        booking.getActiveHeldPointsForCustomer(customerId),
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

      const history = (paginatedHistory.docs || []).map((record) => {
        return {
          id: record.id,
          createdAt: record.createdAt,
          points: record.points,
          type: record.type,
          reason: record.reason || '',
          isPositive: record.points > 0,
        }
      })

      const availablePoints = Math.max(0, authoritativeBalance - activeHeldPoints)
      const formattedAvailablePoints = localization.formatNumber(availablePoints, ctx)

      const rawHeldNotice = localization.translateUiKey('loyalty.portal.heldPointsNotice', ctx)
      const heldPointsNotice = rawHeldNotice
        .replace('{heldPoints}', localization.formatNumber(activeHeldPoints, ctx))
        .replace('{totalPoints}', formattedPointsBalance)

      const uiLabels = {
        pageTitle: localization.translateUiKey('loyalty.portal.pageTitle', ctx),
        pageSubtitle: localization.translateUiKey('loyalty.portal.pageSubtitle', ctx),
        tierMemberSuffix: localization.translateUiKey('loyalty.portal.tierMemberSuffix', ctx),
        availableBalance: localization.translateUiKey('loyalty.portal.availableBalance', ctx),
        pointsUnit: localization.translateUiKey('loyalty.portal.pointsUnit', ctx),
        cashValuePrefix: localization.translateUiKey('loyalty.portal.cashValuePrefix', ctx),
        cashValueSuffix: localization.translateUiKey('loyalty.portal.cashValueSuffix', ctx),
        heldPointsNotice,
        totalQualifyingSpend: localization.translateUiKey('loyalty.portal.totalQualifyingSpend', ctx),
        instantCheckoutDiscount: localization.translateUiKey('loyalty.portal.instantCheckoutDiscount', ctx),
        officialRate: localization.translateUiKey('loyalty.portal.officialRate', ctx),
        yourPointsValue: localization.translateUiKey('loyalty.portal.yourPointsValue', ctx),
        transactionHistoryTitle: localization.translateUiKey('loyalty.portal.transactionHistoryTitle', ctx),
        noTransactions: localization.translateUiKey('loyalty.portal.noTransactions', ctx),
        dateCol: localization.translateUiKey('loyalty.portal.dateCol', ctx),
        referenceCol: localization.translateUiKey('loyalty.portal.referenceCol', ctx),
        typeCol: localization.translateUiKey('loyalty.portal.typeCol', ctx),
        reasonCol: localization.translateUiKey('loyalty.portal.reasonCol', ctx),
        pointsCol: localization.translateUiKey('loyalty.portal.pointsCol', ctx),
      }

      return {
        pointsBalance: authoritativeBalance,
        formattedPointsBalance,
        heldPoints: activeHeldPoints,
        availablePoints,
        formattedAvailablePoints,
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
        pagination: {
          page: paginatedHistory.page,
          limit: paginatedHistory.limit,
          totalDocs: paginatedHistory.totalDocs,
          totalPages: paginatedHistory.totalPages,
          hasNextPage: paginatedHistory.hasNextPage,
          hasPrevPage: paginatedHistory.hasPrevPage,
        },
        uiLabels,
      }
    } catch (err) {
      console.error(`[CustomerLoyaltyLoader] Failed loading loyalty details for customer #${customerId}:`, err)
      throw err
    }
  }

  /**
   * Load public loyalty program configuration (e.g., welcome bonus) for unauthenticated presentation pages.
   */
  static async loadPublicConfig(): Promise<PublicLoyaltyConfigDTO> {
    const { loyalty } = await getApplicationServices()
    const loyaltyConfig = await loyalty.getActiveConfig()
    return {
      welcomeBonus: loyaltyConfig.welcomeBonus,
    }
  }
}
