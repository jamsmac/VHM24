'use client'

import { useMemo } from 'react'
import dynamic from 'next/dynamic'
import { useQuery } from '@tanstack/react-query'
import { dashboardApi } from '@/lib/dashboard-api'
import { machinesApi } from '@/lib/machines-api'
import { tasksApi } from '@/lib/tasks-api'
import { commissionsApi } from '@/lib/commissions-api'
import { StatCard } from '@/components/dashboard/StatCard'
import { AlertsSummaryWidget } from '@/components/dashboard/AlertsSummaryWidget'
import { RecentAlertsWidget } from '@/components/dashboard/RecentAlertsWidget'
import { MapWidget } from '@/components/dashboard/MapWidget'
import { SystemHealthWidget } from '@/components/monitoring/SystemHealthWidget'
import { QuickActions } from '@/components/dashboard/QuickActions'
import { RecentActivityWidget } from '@/components/dashboard/RecentActivityWidget'
import { TodaySummary } from '@/components/dashboard/TodaySummary'
import { TaskCard } from '@/components/tasks/TaskCard'
import { IncidentCard } from '@/components/incidents/IncidentCard'
import { CardSkeleton } from '@/components/ui/LoadingSkeleton'
import { LiveMetrics } from '@/components/realtime/LiveMetrics'
import { JobProgressIndicator } from '@/components/realtime/JobProgressIndicator'
import { DollarSign, ClipboardList, AlertTriangle, Package } from 'lucide-react'
import { useTranslations } from '@/providers/I18nProvider'

// Dynamic imports for heavy chart components (recharts ~400KB)
// This splits them into separate bundles loaded on demand
const SalesOverviewChart = dynamic(
  () => import('@/components/charts').then((mod) => ({ default: mod.SalesOverviewChart })),
  { loading: () => <CardSkeleton />, ssr: false }
)

const MachineStatusChart = dynamic(
  () => import('@/components/charts').then((mod) => ({ default: mod.MachineStatusChart })),
  { loading: () => <CardSkeleton />, ssr: false }
)

const TasksByTypeChart = dynamic(
  () => import('@/components/charts').then((mod) => ({ default: mod.TasksByTypeChart })),
  { loading: () => <CardSkeleton />, ssr: false }
)

const PaymentStatusChart = dynamic(
  () => import('@/components/charts').then((mod) => ({ default: mod.PaymentStatusChart })),
  { loading: () => <CardSkeleton />, ssr: false }
)

const CommissionRevenueChart = dynamic(
  () => import('@/components/charts').then((mod) => ({ default: mod.RevenueChart })),
  { loading: () => <CardSkeleton />, ssr: false }
)

const CommissionByContractChart = dynamic(
  () => import('@/components/charts').then((mod) => ({ default: mod.CommissionByContractChart })),
  { loading: () => <CardSkeleton />, ssr: false }
)

export default function DashboardPage() {
  const { t } = useTranslations()

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: dashboardApi.getStats,
  })

  const { data: recentTasks, isLoading: tasksLoading } = useQuery({
    queryKey: ['dashboard', 'recent-tasks'],
    queryFn: () => dashboardApi.getRecentTasks(5),
  })

  const { data: activeIncidents, isLoading: incidentsLoading } = useQuery({
    queryKey: ['dashboard', 'active-incidents'],
    queryFn: () => dashboardApi.getActiveIncidents(5),
  })

  const { data: commissionDashboard } = useQuery({
    queryKey: ['commissions', 'dashboard'],
    queryFn: commissionsApi.getDashboard,
  })

  const { data: revenueByPeriod } = useQuery({
    queryKey: ['commissions', 'revenue-by-period'],
    queryFn: () => {
      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - 30)
      return commissionsApi.getRevenueByPeriod(
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      )
    },
  })

  const { data: salesOverview } = useQuery({
    queryKey: ['dashboard', 'sales-overview'],
    queryFn: () => dashboardApi.getSalesOverview(7),
  })

  const { data: machineStats } = useQuery({
    queryKey: ['machines', 'stats'],
    queryFn: machinesApi.getStats,
  })

  const { data: taskStats } = useQuery({
    queryKey: ['tasks', 'stats'],
    queryFn: tasksApi.getStats,
  })

  // Transform machine stats for chart (memoized to prevent re-calculation on every render)
  const machineStatusData = useMemo(
    () =>
      machineStats
        ? [
            { status: 'active', count: machineStats.by_status?.active || 0, label: t('machines.active') },
            { status: 'low_stock', count: machineStats.by_status?.low_stock || 0, label: t('machines.lowStock') },
            { status: 'error', count: machineStats.by_status?.error || 0, label: t('machines.error') },
            { status: 'maintenance', count: machineStats.by_status?.maintenance || 0, label: t('machines.maintenance') },
            { status: 'offline', count: machineStats.by_status?.offline || 0, label: t('machines.offline') },
          ].filter((item) => item.count > 0)
        : [],
    [machineStats, t]
  )

  // Transform task stats for chart (memoized)
  const taskTypeData = useMemo(
    () =>
      taskStats
        ? [
            { type: 'refill', count: taskStats.by_type?.refill || 0, label: t('tasks.refill') },
            { type: 'collection', count: taskStats.by_type?.collection || 0, label: t('tasks.collection') },
            { type: 'repair', count: taskStats.by_type?.repair || 0, label: t('tasks.repair') },
            { type: 'maintenance', count: taskStats.by_type?.maintenance || 0, label: t('tasks.maintenance') },
            { type: 'cleaning', count: taskStats.by_type?.cleaning || 0, label: t('tasks.cleaning') },
          ].filter((item) => item.count > 0)
        : [],
    [taskStats, t]
  )

  // Transform payment status data (memoized)
  const paymentStatusData = useMemo(
    () =>
      commissionDashboard
        ? [
            {
              status: 'pending' as const,
              count: commissionDashboard.stats.pending_count || 0,
              totalAmount: commissionDashboard.stats.pending_amount || 0,
            },
            {
              status: 'paid' as const,
              count: commissionDashboard.stats.paid_count || 0,
              totalAmount: commissionDashboard.stats.paid_amount || 0,
            },
            {
              status: 'overdue' as const,
              count: commissionDashboard.stats.overdue_count || 0,
              totalAmount: commissionDashboard.stats.overdue_amount || 0,
            },
            {
              status: 'cancelled' as const,
              count: 0,
              totalAmount: 0,
            },
          ]
        : [],
    [commissionDashboard]
  )

  // Transform revenue trend data (memoized)
  const revenueTrendData = useMemo(
    () =>
      revenueByPeriod
        ? revenueByPeriod.map((item) => ({
            date: item.date,
            revenue: item.revenue,
            commission: item.commission,
          }))
        : [],
    [revenueByPeriod]
  )

  // Transform commission by contract data (memoized)
  const commissionByContractData = useMemo(
    () =>
      commissionDashboard?.revenue_by_contract
        ? commissionDashboard.revenue_by_contract.map((item) => ({
            contractName: item.contract_number || 'Unknown',
            commission: item.total_commission || 0,
            revenue: item.total_revenue || 0,
          }))
        : [],
    [commissionDashboard]
  )

  // Transform initial live metrics data (memoized)
  const initialLiveMetricsData = useMemo(
    () =>
      commissionDashboard
        ? {
            totalRevenue: commissionDashboard.stats.total_revenue || 0,
            totalCommissions: commissionDashboard.stats.total_commission || 0,
            pendingPayments: commissionDashboard.stats.pending_amount || 0,
            overduePayments: commissionDashboard.stats.overdue_amount || 0,
            activeContracts: 0,
            timestamp: new Date().toISOString(),
          }
        : undefined,
    [commissionDashboard]
  )

  return (
    <div className="space-y-8">
      {/* Today Summary & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <TodaySummary />
        </div>
        <QuickActions compact />
      </div>

      {/* Commission Live Metrics */}
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-4">
          {t('dashboard.charts.revenueCommission')} (Real-time)
        </h2>
        <LiveMetrics initialData={initialLiveMetricsData} />
      </div>

      {/* System Stats Cards */}
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-4">Система</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statsLoading ? (
            Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)
          ) : (
            <>
              <StatCard
                title={t('dashboard.stats.revenueToday')}
                value={`${stats?.total_revenue_today?.toLocaleString('ru-RU') || 0} сўм`}
                change={stats?.revenue_vs_yesterday}
                icon={DollarSign}
                color="green"
              />
              <StatCard
                title={t('dashboard.stats.activeTasks')}
                value={stats?.total_tasks_active || 0}
                change={stats?.tasks_vs_yesterday}
                icon={ClipboardList}
                color="blue"
              />
              <StatCard
                title={t('dashboard.stats.openIncidents')}
                value={stats?.total_incidents_open || 0}
                change={stats?.incidents_vs_yesterday}
                icon={AlertTriangle}
                color="orange"
              />
              <StatCard
                title={t('dashboard.stats.activeMachines')}
                value={stats?.total_machines_active || 0}
                change={stats?.machines_vs_yesterday}
                icon={Package}
                color="purple"
              />
            </>
          )}
        </div>
      </div>

      {/* Alerts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AlertsSummaryWidget />
        <RecentAlertsWidget />
      </div>

      {/* Map Widget & System Health */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <MapWidget />
        </div>
        <SystemHealthWidget compact />
      </div>

      {/* Analytics Charts - Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Overview */}
        {salesOverview && salesOverview.length > 0 && (
          <SalesOverviewChart
            data={salesOverview}
            title={t('dashboard.charts.salesOverview')}
            height={300}
            showTransactions={false}
          />
        )}

        {/* Machine Status Distribution */}
        {machineStatusData.length > 0 && (
          <MachineStatusChart
            data={machineStatusData}
            title={t('dashboard.charts.machineStatus')}
            height={300}
          />
        )}
      </div>

      {/* Analytics Charts - Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tasks by Type */}
        {taskTypeData.length > 0 && (
          <TasksByTypeChart
            data={taskTypeData}
            title={t('dashboard.charts.tasksByType')}
            height={300}
          />
        )}

        {/* Payment Status Distribution */}
        {paymentStatusData.length > 0 && (
          <PaymentStatusChart
            data={paymentStatusData}
            title="Статус платежей"
            height={300}
          />
        )}
      </div>

      {/* Revenue & Commission Trend */}
      {revenueTrendData.length > 0 && (
        <CommissionRevenueChart
          data={revenueTrendData}
          title="Динамика выручки и комиссий (30 дней)"
          height={350}
        />
      )}

      {/* Commission by Contract */}
      {commissionByContractData.length > 0 && (
        <CommissionByContractChart
          data={commissionByContractData}
          title="Топ договоров по комиссиям"
          height={350}
          maxItems={8}
        />
      )}

      {/* Recent Activity & Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <RecentActivityWidget maxItems={8} />

        {/* Recent Tasks */}
        <div>
          <h2 className="text-xl font-semibold text-foreground mb-4">
            {t('dashboard.sections.recentTasks')}
          </h2>
          <div className="space-y-4">
            {tasksLoading ? (
              Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)
            ) : recentTasks && recentTasks.length > 0 ? (
              recentTasks.map((task) => <TaskCard key={task.id} task={task} />)
            ) : (
              <p className="text-muted-foreground text-center py-8">
                {t('dashboard.sections.noTasks')}
              </p>
            )}
          </div>
        </div>

        {/* Active Incidents */}
        <div>
          <h2 className="text-xl font-semibold text-foreground mb-4">
            {t('dashboard.sections.activeIncidents')}
          </h2>
          <div className="space-y-4">
            {incidentsLoading ? (
              Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)
            ) : activeIncidents && activeIncidents.length > 0 ? (
              activeIncidents.map((incident) => (
                <IncidentCard key={incident.id} incident={incident} />
              ))
            ) : (
              <p className="text-muted-foreground text-center py-8">
                {t('dashboard.sections.noIncidents')}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Real-time Job Progress Indicator */}
      <JobProgressIndicator autoSubscribe maxJobs={5} />
    </div>
  )
}
