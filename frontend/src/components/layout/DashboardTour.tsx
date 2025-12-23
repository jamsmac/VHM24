'use client'

import { useState } from 'react'
import { ProductTour, WelcomeModal, TourStep } from '@/components/ui/ProductTour'

const DASHBOARD_TOUR_STEPS: TourStep[] = [
  {
    target: '[data-tour="sidebar-logo"]',
    title: 'Добро пожаловать в VendHub!',
    content: 'Это ваш центр управления вендинговым бизнесом. Давайте познакомимся с основными функциями.',
    placement: 'right',
  },
  {
    target: '[data-tour="nav-machines"]',
    title: 'Управление автоматами',
    content: 'Здесь вы найдете список всех вендинговых автоматов, их статусы и детальную информацию.',
    placement: 'right',
  },
  {
    target: '[data-tour="nav-tasks"]',
    title: 'Задачи',
    content: 'Создавайте и отслеживайте задачи по обслуживанию автоматов: пополнение, инкассация, ремонт.',
    placement: 'right',
  },
  {
    target: '[data-tour="nav-transactions"]',
    title: 'Финансы',
    content: 'Контролируйте все финансовые операции, просматривайте транзакции и анализируйте доходы.',
    placement: 'right',
  },
  {
    target: '[data-tour="header-search"]',
    title: 'Быстрый поиск',
    content: 'Используйте Cmd+K (или Ctrl+K) для быстрого поиска по всей системе: автоматы, задачи, команды.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="header-notifications"]',
    title: 'Уведомления',
    content: 'Получайте оповещения о важных событиях: низкий остаток, поломки, требующие внимания автоматы.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="header-user"]',
    title: 'Профиль',
    content: 'Управляйте настройками аккаунта, переключайте тему оформления и выходите из системы.',
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
