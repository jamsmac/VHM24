'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTelegram } from '../components/TelegramProvider'
import { apiClient } from '@/lib/axios'

interface UserProfile {
  id: string
  telegram_id: string
  first_name: string
  last_name?: string
  username?: string
  phone?: string
  language_code?: string
  loyalty_account?: {
    points_balance: number
    total_points_earned: number
    level: string
  }
}

export default function ProfilePage() {
  const router = useRouter()
  const { webApp, user, isReady, isAuthenticated, authenticate, showBackButton, hideBackButton, colorScheme } = useTelegram()

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Back button
  useEffect(() => {
    if (isReady) {
      showBackButton(() => router.push('/tg'))
      return () => hideBackButton()
    }
  }, [isReady, router, showBackButton, hideBackButton])

  // Load profile
  useEffect(() => {
    const loadProfile = async () => {
      if (!isAuthenticated) {
        const success = await authenticate()
        if (!success) {
          setIsLoading(false)
          return
        }
      }

      try {
        const response = await apiClient.get('/client/profile')
        setProfile(response.data)
      } catch (error) {
        console.error('Failed to load profile:', error)
        // Use Telegram user data as fallback
        if (user) {
          setProfile({
            id: '',
            telegram_id: user.id.toString(),
            first_name: user.first_name,
            last_name: user.last_name,
            username: user.username,
            language_code: user.language_code,
          })
        }
      } finally {
        setIsLoading(false)
      }
    }

    if (isReady) {
      loadProfile()
    }
  }, [isReady, isAuthenticated, authenticate, user])

  const menuItems = [
    {
      icon: '⭐',
      title: 'Бонусы',
      subtitle: profile?.loyalty_account
        ? `${profile.loyalty_account.points_balance} баллов`
        : 'Накапливайте баллы',
      href: '/profile/bonuses',
    },
    {
      icon: '📋',
      title: 'История заказов',
      subtitle: 'Ваши покупки',
      href: '/profile/history',
    },
    {
      icon: '⚙️',
      title: 'Настройки',
      subtitle: 'Уведомления, язык',
      href: '/profile/settings',
    },
    {
      icon: '❓',
      title: 'Помощь',
      subtitle: 'FAQ и поддержка',
      href: '/profile/help',
    },
  ]

  if (isLoading) {
    return (
      <div className="tg-app" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div className="tg-skeleton" style={{ width: 48, height: 48, borderRadius: '50%' }} />
      </div>
    )
  }

  const displayName = profile?.first_name || user?.first_name || 'Пользователь'
  const fullName = [profile?.first_name || user?.first_name, profile?.last_name || user?.last_name]
    .filter(Boolean)
    .join(' ')

  return (
    <div className="tg-app tg-bottom-safe">
      {/* Header */}
      <div className="tg-header">
        <div className="tg-header-title">Профиль</div>
      </div>

      {/* User info */}
      <div className="tg-section">
        <div className="tg-card" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* Avatar */}
          <div
            style={{
              width: 60,
              height: 60,
              borderRadius: '50%',
              backgroundColor: 'var(--tg-button-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--tg-button-text-color)',
              fontSize: 24,
              fontWeight: 600,
            }}
          >
            {displayName.charAt(0).toUpperCase()}
          </div>

          {/* Name and username */}
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 18, marginBottom: 4 }}>
              {fullName || displayName}
            </div>
            {(profile?.username || user?.username) && (
              <div className="tg-hint">
                @{profile?.username || user?.username}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Loyalty card */}
      {profile?.loyalty_account && (
        <div className="tg-section">
          <div
            className="tg-card"
            onClick={() => router.push('/tg/profile/bonuses')}
            style={{
              background: 'linear-gradient(135deg, var(--tg-button-color), #9C27B0)',
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ opacity: 0.9, fontSize: 14, marginBottom: 4 }}>Баланс баллов</div>
                <div style={{ fontSize: 32, fontWeight: 700 }}>
                  {profile.loyalty_account.points_balance}
                </div>
              </div>
              <div
                style={{
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  padding: '4px 12px',
                  borderRadius: 12,
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                {profile.loyalty_account.level || 'Стандарт'}
              </div>
            </div>
            <div style={{ marginTop: 12, fontSize: 13, opacity: 0.8 }}>
              Всего накоплено: {profile.loyalty_account.total_points_earned} баллов
            </div>
          </div>
        </div>
      )}

      {/* Menu items */}
      <div className="tg-section">
        <div className="tg-list">
          {menuItems.map((item, index) => (
            <div
              key={index}
              className="tg-list-item"
              onClick={() => router.push(item.href)}
              style={{ cursor: 'pointer' }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  backgroundColor: 'var(--tg-secondary-bg-color)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 20,
                }}
              >
                {item.icon}
              </div>
              <div className="tg-list-item-content">
                <div className="tg-list-item-title">{item.title}</div>
                <div className="tg-list-item-subtitle">{item.subtitle}</div>
              </div>
              <div style={{ color: 'var(--tg-hint-color)', fontSize: 20 }}>›</div>
            </div>
          ))}
        </div>
      </div>

      {/* App info */}
      <div className="tg-section" style={{ textAlign: 'center' }}>
        <div className="tg-hint" style={{ fontSize: 12 }}>
          VendHub v1.0.0
        </div>
        <div className="tg-hint" style={{ fontSize: 11, marginTop: 4 }}>
          {colorScheme === 'dark' ? '🌙' : '☀️'} {colorScheme === 'dark' ? 'Тёмная тема' : 'Светлая тема'}
        </div>
      </div>

      {/* Tab bar */}
      <div className="tg-tab-bar">
        <div className="tg-tab-item" onClick={() => router.push('/tg')}>
          <div className="tg-tab-icon">🏠</div>
          <div className="tg-tab-label">Главная</div>
        </div>
        <div className="tg-tab-item" onClick={() => router.push('/tg/profile/history')}>
          <div className="tg-tab-icon">📋</div>
          <div className="tg-tab-label">Заказы</div>
        </div>
        <div className="tg-tab-item tg-tab-item-active">
          <div className="tg-tab-icon">👤</div>
          <div className="tg-tab-label">Профиль</div>
        </div>
      </div>
    </div>
  )
}
