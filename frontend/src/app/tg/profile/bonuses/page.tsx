'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTelegram } from '../../components/TelegramProvider'
import { apiClient } from '@/lib/axios'

interface LoyaltyAccount {
  points_balance: number
  total_points_earned: number
  total_points_redeemed: number
  level: string
  next_level_points?: number
}

interface PointsTransaction {
  id: string
  type: 'earned' | 'redeemed' | 'expired' | 'bonus'
  amount: number
  description: string
  created_at: string
  order_id?: string
}

export default function BonusesPage() {
  const router = useRouter()
  const { isReady, isAuthenticated, authenticate, showBackButton, hideBackButton, hapticFeedback } = useTelegram()

  const [account, setAccount] = useState<LoyaltyAccount | null>(null)
  const [transactions, setTransactions] = useState<PointsTransaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'all' | 'earned' | 'redeemed'>('all')

  // Back button
  useEffect(() => {
    if (isReady) {
      showBackButton(() => router.push('/tg/profile'))
      return () => hideBackButton()
    }
  }, [isReady, router, showBackButton, hideBackButton])

  // Load data
  useEffect(() => {
    const loadData = async () => {
      if (!isAuthenticated) {
        const success = await authenticate()
        if (!success) {
          setIsLoading(false)
          return
        }
      }

      try {
        const [accountRes, transactionsRes] = await Promise.all([
          apiClient.get('/client/loyalty/account'),
          apiClient.get('/client/loyalty/transactions'),
        ])
        setAccount(accountRes.data)
        setTransactions(transactionsRes.data.items || transactionsRes.data || [])
      } catch (error) {
        console.error('Failed to load loyalty data:', error)
        // Mock data for development
        setAccount({
          points_balance: 150,
          total_points_earned: 1250,
          total_points_redeemed: 1100,
          level: 'Серебро',
          next_level_points: 2000,
        })
        setTransactions([
          {
            id: '1',
            type: 'earned',
            amount: 50,
            description: 'Покупка кофе',
            created_at: new Date(Date.now() - 86400000).toISOString(),
          },
          {
            id: '2',
            type: 'redeemed',
            amount: -100,
            description: 'Списание при заказе',
            created_at: new Date(Date.now() - 172800000).toISOString(),
          },
          {
            id: '3',
            type: 'bonus',
            amount: 200,
            description: 'Бонус за регистрацию',
            created_at: new Date(Date.now() - 604800000).toISOString(),
          },
        ])
      } finally {
        setIsLoading(false)
      }
    }

    if (isReady) {
      loadData()
    }
  }, [isReady, isAuthenticated, authenticate])

  const handleTabChange = (tab: typeof activeTab) => {
    hapticFeedback?.selectionChanged()
    setActiveTab(tab)
  }

  const filteredTransactions = transactions.filter(t => {
    if (activeTab === 'all') return true
    if (activeTab === 'earned') return t.type === 'earned' || t.type === 'bonus'
    if (activeTab === 'redeemed') return t.type === 'redeemed' || t.type === 'expired'
    return true
  })

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getTransactionIcon = (type: PointsTransaction['type']) => {
    switch (type) {
      case 'earned': return '💰'
      case 'redeemed': return '🛒'
      case 'expired': return '⏰'
      case 'bonus': return '🎁'
      default: return '•'
    }
  }

  const getTransactionColor = (type: PointsTransaction['type']) => {
    switch (type) {
      case 'earned':
      case 'bonus':
        return '#4CAF50'
      case 'redeemed':
      case 'expired':
        return '#f44336'
      default:
        return 'inherit'
    }
  }

  if (isLoading) {
    return (
      <div className="tg-app" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div className="tg-skeleton" style={{ width: 48, height: 48, borderRadius: '50%' }} />
      </div>
    )
  }

  const progressPercent = account?.next_level_points
    ? Math.min(100, (account.total_points_earned / account.next_level_points) * 100)
    : 100

  return (
    <div className="tg-app tg-bottom-safe">
      {/* Header */}
      <div className="tg-header">
        <div className="tg-header-title">Бонусы</div>
      </div>

      {/* Balance card */}
      <div className="tg-section">
        <div
          className="tg-card"
          style={{
            background: 'linear-gradient(135deg, #9C27B0, #673AB7)',
            color: '#fff',
            textAlign: 'center',
          }}
        >
          <div style={{ opacity: 0.9, fontSize: 14, marginBottom: 8 }}>Ваш баланс</div>
          <div style={{ fontSize: 48, fontWeight: 700, marginBottom: 4 }}>
            {account?.points_balance || 0}
          </div>
          <div style={{ opacity: 0.8, fontSize: 14 }}>баллов</div>

          {/* Level badge */}
          <div
            style={{
              display: 'inline-block',
              marginTop: 16,
              backgroundColor: 'rgba(255,255,255,0.2)',
              padding: '6px 16px',
              borderRadius: 16,
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            ⭐ {account?.level || 'Стандарт'}
          </div>
        </div>
      </div>

      {/* Progress to next level */}
      {account?.next_level_points && (
        <div className="tg-section">
          <div className="tg-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span className="tg-hint">До следующего уровня</span>
              <span style={{ fontWeight: 500 }}>
                {account.total_points_earned} / {account.next_level_points}
              </span>
            </div>
            <div
              style={{
                height: 8,
                backgroundColor: 'var(--tg-secondary-bg-color)',
                borderRadius: 4,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${progressPercent}%`,
                  background: 'linear-gradient(90deg, #9C27B0, #673AB7)',
                  borderRadius: 4,
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="tg-section">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="tg-card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#4CAF50' }}>
              {account?.total_points_earned || 0}
            </div>
            <div className="tg-hint" style={{ fontSize: 12 }}>Накоплено</div>
          </div>
          <div className="tg-card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#f44336' }}>
              {account?.total_points_redeemed || 0}
            </div>
            <div className="tg-hint" style={{ fontSize: 12 }}>Потрачено</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tg-section">
        <div className="tg-section-title">История</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          {(['all', 'earned', 'redeemed'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => handleTabChange(tab)}
              className={`tg-button ${activeTab === tab ? 'tg-button-primary' : 'tg-button-secondary'}`}
              style={{ flex: 1, padding: '8px 12px', fontSize: 13 }}
            >
              {tab === 'all' ? 'Все' : tab === 'earned' ? 'Начислено' : 'Списано'}
            </button>
          ))}
        </div>

        {/* Transactions list */}
        {filteredTransactions.length === 0 ? (
          <div className="tg-empty-state" style={{ padding: 32 }}>
            <div className="tg-empty-state-icon">📭</div>
            <div className="tg-empty-state-text">Нет операций</div>
          </div>
        ) : (
          <div className="tg-list">
            {filteredTransactions.map(transaction => (
              <div key={transaction.id} className="tg-list-item">
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    backgroundColor: 'var(--tg-secondary-bg-color)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 18,
                  }}
                >
                  {getTransactionIcon(transaction.type)}
                </div>
                <div className="tg-list-item-content">
                  <div className="tg-list-item-title">{transaction.description}</div>
                  <div className="tg-list-item-subtitle">{formatDate(transaction.created_at)}</div>
                </div>
                <div
                  style={{
                    fontWeight: 600,
                    color: getTransactionColor(transaction.type),
                  }}
                >
                  {transaction.amount > 0 ? '+' : ''}{transaction.amount}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="tg-section">
        <div className="tg-card" style={{ backgroundColor: 'var(--tg-secondary-bg-color)' }}>
          <div style={{ fontWeight: 500, marginBottom: 8 }}>💡 Как накопить баллы?</div>
          <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14 }} className="tg-hint">
            <li>Совершайте покупки — 1 балл за каждые 1000 сум</li>
            <li>Приглашайте друзей — 100 баллов за каждого</li>
            <li>Участвуйте в акциях — до 500 баллов</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
