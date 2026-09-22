/**
 * Semantic Design Tokens for the Universal Table System.
 * Encapsulates the Dark Luxury Cockpit palette shown in the target design.
 * All classes are 100% scoped under .universal-table-root with ZERO global resets.
 */
export const tableTokens = {
  container: 'universal-table-root',
  card: 'ut-card',
  tableWrapper: 'ut-table-wrapper',
  table: 'ut-table',
  thead: 'ut-thead',
  th: 'ut-th',
  thCheckbox: 'ut-th-checkbox',
  tbody: 'ut-tbody',
  tr: 'ut-tr',
  td: 'ut-td',
  tdCheckbox: 'ut-td-checkbox',
  checkbox: 'ut-checkbox',
  
  // KPI summary strip tokens
  kpiStrip: 'ut-kpi-strip',
  kpiCard: 'ut-kpi-card',
  kpiCardContent: 'ut-kpi-card-content',
  kpiIcon: 'ut-kpi-icon',
  kpiText: 'ut-kpi-text',
  kpiStatRow: 'ut-kpi-stat-row',
  kpiValue: 'ut-kpi-value',
  kpiBadge: 'ut-kpi-badge',
  kpiLabel: 'ut-kpi-label',
  kpiBar: 'ut-kpi-bar',
  kpiBarFill: 'ut-kpi-bar-fill',
} as const
