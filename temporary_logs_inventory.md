# Temporary Diagnostic Logs Inventory

Below is the list of temporary diagnostic console log statements added to trace the Loyalty settings cache during debugging. **Please remove or comment out these lines before pushing or deploying the code to production.**

---

### 1. [program-registry.ts](file:///f:/new-websites/laube-rebuild/Rebuild-Laube-Voyage-app-last/src/domains/loyalty/program-registry.ts)

*   **Instance ID Field Addition (Line 13):**
    ```typescript
    public readonly id = Math.random().toString(36).substring(2, 9)
    ```
*   **Constructor Logger (Lines 15–19):**
    ```typescript
    private constructor() {
      console.log(
        `[LoyaltyProgramRegistry] Class constructor initialized. Instance ID: ${this.id}, PID: ${process.pid}, Uptime: ${process.uptime()}s`,
      )
    }
    ```
*   **getProgram Start Logger (Lines 34–36):**
    ```typescript
    console.log(
      `[LoyaltyProgramRegistry.getProgram] Instance ID: ${this.id}, PinnedConfig passed: ${!!pinnedConfig}, PID: ${process.pid}`,
    )
    ```
*   **getProgram Cache Hit Logger (Lines 39–47):**
    ```typescript
    console.log(
      `[LoyaltyProgramRegistry.getProgram] Returning CACHED config from instance: ${this.id}. Cache data:`,
      {
        baseEarnRate: this.cache.baseEarnRate,
        redemptionPointsUnit: this.cache.redemptionPointsUnit,
        redemptionValueEGP: this.cache.redemptionValueEGP,
      },
    )
    ```
*   **getProgram Cache Miss Logger (Lines 50–57):**
    ```typescript
    console.log(
      `[LoyaltyProgramRegistry.getProgram] Cache MISS. Fetched fresh from DB. Storing in instance: ${this.id}. Data:`,
      {
        baseEarnRate: config.baseEarnRate,
        redemptionPointsUnit: config.redemptionPointsUnit,
        redemptionValueEGP: config.redemptionValueEGP,
      },
    )
    ```
*   **Cache Invalidation Logger (Lines 61–64):**
    ```typescript
    console.log(
      `[LoyaltyProgramRegistry.invalidate] Invalidating cache on instance: ${this.id}, PID: ${process.pid}`,
    )
    ```

---

### 2. [afterLoyaltySettingsChange.ts](file:///f:/new-websites/laube-rebuild/Rebuild-Laube-Voyage-app-last/src/globals/hooks/afterLoyaltySettingsChange.ts)

*   **Hook Trigger & Saved Doc Logger (Lines 9–19):**
    ```typescript
    console.log(
      `[afterLoyaltySettingsChange Hook] Triggered. PID: ${process.pid}, Uptime: ${process.uptime()}s`,
    )
    console.log(`[afterLoyaltySettingsChange Hook] Global payload doc saved:`, {
      baseEarnRate: doc?.baseEarnRate,
      redemptionPointsUnit: doc?.redemptionPointsUnit,
      redemptionValueEGP: doc?.redemptionValueEGP,
    })
    console.log(
      `[afterLoyaltySettingsChange Hook] Invalidating cache on registry ID: ${(loyaltyProgramRegistry as any).id}`,
    )
    ```

---

### 3. [workflow.ts](file:///f:/new-websites/laube-rebuild/Rebuild-Laube-Voyage-app-last/src/domains/loyalty/workflow.ts)

*   **Workflow grantWelcomeBonus Logger (Lines 59–65):**
    ```typescript
    console.log(`[LoyaltyWorkflowEngine.grantWelcomeBonus] Received parameter config: ${!!config}, PID: ${process.pid}, Uptime: ${process.uptime()}s`)
    const activeConfig = await this.getActiveConfig(config)
    console.log(`[LoyaltyWorkflowEngine.grantWelcomeBonus] Config resolved:`, {
      baseEarnRate: activeConfig.baseEarnRate,
      redemptionPointsUnit: activeConfig.redemptionPointsUnit,
      redemptionValueEGP: activeConfig.redemptionValueEGP,
    })
    ```

---

### 4. [points-earner.ts](file:///f:/new-websites/laube-rebuild/Rebuild-Laube-Voyage-app-last/src/domains/loyalty/points-earner.ts)

*   **PointsEarner grantWelcomeBonus Logger (Lines 75–81):**
    ```typescript
    console.log(`[PointsEarner.grantWelcomeBonus] Triggered. PID: ${process.pid}, Uptime: ${process.uptime()}s`)
    console.log(`[PointsEarner.grantWelcomeBonus] Config received:`, {
      baseEarnRate: config.baseEarnRate,
      redemptionPointsUnit: config.redemptionPointsUnit,
      redemptionValueEGP: config.redemptionValueEGP,
      welcomeBonus: config.welcomeBonus,
    })
    ```
