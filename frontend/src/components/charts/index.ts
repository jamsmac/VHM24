/**
 * Charts Components Index
 *
 * Central export file for all chart components.
 * Built on Recharts for React-based visualizations.
 */

// ============================================================================
// Existing Charts
// ============================================================================

export { RevenueChart } from './RevenueChart'
export { CommissionByContractChart } from './CommissionByContractChart'
export { PaymentStatusChart } from './PaymentStatusChart'
export { MachineStatusChart } from './MachineStatusChart'
export { TasksByTypeChart } from './TasksByTypeChart'
export { SalesOverviewChart } from './SalesOverviewChart'

// ============================================================================
// Sales & Trend Charts
// ============================================================================

export { SalesTrendChart, SalesComparisonChart } from './SalesTrendChart'

// ============================================================================
// Inventory Visualizations
// ============================================================================

export { InventoryHeatmap, TimeHeatmap } from './InventoryHeatmap'

// ============================================================================
// Performance Metrics
// ============================================================================

export {
  MachineRankingChart,
  MachineHealthRadar,
  KPISummary,
  CategoryDonut,
} from './PerformanceMetrics'

// ============================================================================
// Real-Time Charts
// ============================================================================

export { RealTimeChart, MultiRealTimeChart, Sparkline } from './RealTimeChart'
