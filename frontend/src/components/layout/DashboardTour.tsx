'use client'

import { useState } from 'react'
import { ProductTour, WelcomeModal, TourStep } from '@/components/ui/ProductTour'

const DASHBOARD_TOUR_STEPS: TourStep[] = [
  {
    target: '[data-tour="sidebar"]',
    title: 'Навигация',
    content: 'Используйте боковое меню для навигации между разделами. Группы можно сворачивать и разворачивать.',
    placement: 'right',
  },
  {
    target: '[data-tour="machines"]',
    title: 'Управление автоматами',
    content: 'Здесь вы найдете список всех вендинговых автоматов, их статусы и детальную информацию.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="tasks"]',
    title: 'Задачи',
    content: 'Создавайте и отслеживайте задачи по обслуживанию автоматов: пополнение, инкассация, ремонт.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="analytics"]',
    title: 'Аналитика',
    content: 'Отслеживайте продажи, выручку и эффективность работы автоматов в разделе отчетов.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="notifications"]',
    title: 'Уведомления',
    content: 'Получайте оповещения о важных событиях: низкий остаток, поломки, требующие внимания автоматы.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="user-menu"]',
    title: 'Профиль',
    content: 'Управляйте настройками аккаунта и системы в разделе профиля.',
    placement: 'left',
  },
]

export function DashboardTour() {
  const [showTour, setShowTour] = useState(false)

  return (
    <>
      <WelcomeModal
        tourId="dashboard"
        onStartTour={() => setShowTour(true)}
        onSkip={() => {}}
      />

      {showTour && (
        <ProductTour
          tourId="dashboard"
          steps={DASHBOARD_TOUR_STEPS}
          onComplete={() => setShowTour(false)}
          onSkip={() => setShowTour(false)}
        />
      )}
    </>
  )
}
