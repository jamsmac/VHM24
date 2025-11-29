/**
 * Centralized lazy loading configuration for heavy components
 *
 * This file provides pre-configured lazy-loaded components to improve
 * initial bundle size and page load performance.
 */

import { lazy } from 'react'

/**
 * Heavy modals - loaded only when needed
 */
export const ComponentModal = lazy(() =>
  import('@/components/equipment/ComponentModal').then(module => ({
    default: module.ComponentModal
  }))
)

export const ComponentMovementModal = lazy(() =>
  import('@/components/equipment/ComponentMovementModal').then(module => ({
    default: module.ComponentMovementModal
  }))
)

export const SparePartModal = lazy(() =>
  import('@/components/equipment/SparePartModal').then(module => ({
    default: module.SparePartModal
  }))
)

export const StockAdjustmentModal = lazy(() =>
  import('@/components/equipment/StockAdjustmentModal').then(module => ({
    default: module.StockAdjustmentModal
  }))
)

/**
 * Chart components - loaded on demand for analytics pages
 */
export const RevenueChart = lazy(() =>
  import('@/components/charts/RevenueChart').then(module => ({
    default: module.RevenueChart
  }))
)

export const MachineStatusChart = lazy(() =>
  import('@/components/charts/MachineStatusChart').then(module => ({
    default: module.MachineStatusChart
  }))
)

export const SalesOverviewChart = lazy(() =>
  import('@/components/charts/SalesOverviewChart').then(module => ({
    default: module.SalesOverviewChart
  }))
)

export const TasksByTypeChart = lazy(() =>
  import('@/components/charts/TasksByTypeChart').then(module => ({
    default: module.TasksByTypeChart
  }))
)

export const CommissionByContractChart = lazy(() =>
  import('@/components/charts/CommissionByContractChart').then(module => ({
    default: module.CommissionByContractChart
  }))
)

export const PaymentStatusChart = lazy(() =>
  import('@/components/charts/PaymentStatusChart').then(module => ({
    default: module.PaymentStatusChart
  }))
)

/**
 * Special components - loaded when needed
 */
export const QRScanner = lazy(() =>
  import('@/components/QRScanner').then(module => ({
    default: module.QRScanner
  }))
)

export const PhotoUploader = lazy(() =>
  import('@/components/tasks/PhotoUploader').then(module => ({
    default: module.PhotoUploader
  }))
)

export const TaskComponentsSelector = lazy(() =>
  import('@/components/tasks/TaskComponentsSelector').then(module => ({
    default: module.TaskComponentsSelector
  }))
)
