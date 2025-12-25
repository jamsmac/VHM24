'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTelegram } from '../../components/TelegramProvider'
import { apiClient } from '@/lib/axios'

interface NotificationSettings {
  orders: boolean
  promotions: boolean
  bonuses: boolean
}

export default function SettingsPage() {
  const router = useRouter()
  const { isReady, webApp, showBackButton, hideBackButton, hapticFeedback, colorScheme } = useTelegram()

  const [notifications, setNotifications] = useState<NotificationSettings>({
    orders: true,
    promotions: true,
    bonuses: true,
  })
  const [language, setLanguage] = useState<'ru' | 'uz'>('ru')

  // Back button
  useEffect(() => {
    if (isReady) {
      showBackButton(() => router.push('/tg/profile'))
      return () => hideBackButton()
    }
  }, [isReady, router, showBackButton, hideBackButton])

  // Load settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await apiClient.get('/client/settings')
        if (response.data.notifications) {
          setNotifications(response.data.notifications)
        }
        if (response.data.language) {
          setLanguage(response.data.language)
        }
      } catch (error) {
        console.error('Failed to load settings:', error)
        // Use defaults
      }
    }

    if (isReady) {
      loadSettings()
    }
  }, [isReady])

  const handleNotificationChange = async (key: keyof NotificationSettings) => {
    hapticFeedback?.impactOccurred('light')
    const newValue = !notifications[key]
    setNotifications(prev => ({ ...prev, [key]: newValue }))

    try {
      await apiClient.patch('/client/settings', {
        notifications: { ...notifications, [key]: newValue },
      })
    } catch (error) {
      console.error('Failed to save setting:', error)
      // Revert on error
      setNotifications(prev => ({ ...prev, [key]: !newValue }))
      hapticFeedback?.notificationOccurred('error')
    }
  }

  const handleLanguageChange = async (newLang: 'ru' | 'uz') => {
    if (newLang === language) return

    hapticFeedback?.impactOccurred('light')
    setLanguage(newLang)

    try {
      await apiClient.patch('/client/settings', { language: newLang })
      hapticFeedback?.notificationOccurred('success')
    } catch (error) {
      console.error('Failed to save language:', error)
      setLanguage(language)
      hapticFeedback?.notificationOccurred('error')
    }
  }

  const handleDeleteAccount = () => {
    if (webApp) {
      webApp.showConfirm(
        'Вы уверены, что хотите удалить аккаунт? Это действие нельзя отменить.',
        (confirmed) => {
          if (confirmed) {
            hapticFeedback?.notificationOccurred('warning')
            // TODO: Implement account deletion
            webApp.showAlert('Запрос на удаление отправлен. Мы свяжемся с вами.')
          }
        }
      )
    } else {
      if (confirm('Вы уверены, что хотите удалить аккаунт?')) {
        alert('Запрос на удаление отправлен.')
      }
    }
  }

  return (
    <div className="tg-app tg-bottom-safe">
      {/* Header */}
      <div className="tg-header">
        <div className="tg-header-title">Настройки</div>
      </div>

      {/* Notifications */}
      <div className="tg-section">
        <div className="tg-section-title">Уведомления</div>
        <div className="tg-list">
          <div className="tg-list-item">
            <div className="tg-list-item-content">
              <div className="tg-list-item-title">Статус заказов</div>
              <div className="tg-list-item-subtitle">Уведомления о ваших заказах</div>
            </div>
            <label className="tg-switch">
              <input
                type="checkbox"
                checked={notifications.orders}
                onChange={() => handleNotificationChange('orders')}
              />
              <span className="tg-switch-slider" />
            </label>
          </div>

          <div className="tg-list-item">
            <div className="tg-list-item-content">
              <div className="tg-list-item-title">Акции и скидки</div>
              <div className="tg-list-item-subtitle">Специальные предложения</div>
            </div>
            <label className="tg-switch">
              <input
                type="checkbox"
                checked={notifications.promotions}
                onChange={() => handleNotificationChange('promotions')}
              />
              <span className="tg-switch-slider" />
            </label>
          </div>

          <div className="tg-list-item">
            <div className="tg-list-item-content">
              <div className="tg-list-item-title">Бонусы</div>
              <div className="tg-list-item-subtitle">Начисление и сгорание баллов</div>
            </div>
            <label className="tg-switch">
              <input
                type="checkbox"
                checked={notifications.bonuses}
                onChange={() => handleNotificationChange('bonuses')}
              />
              <span className="tg-switch-slider" />
            </label>
          </div>
        </div>
      </div>

      {/* Language */}
      <div className="tg-section">
        <div className="tg-section-title">Язык</div>
        <div className="tg-card">
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className={`tg-button ${language === 'ru' ? 'tg-button-primary' : 'tg-button-secondary'}`}
              onClick={() => handleLanguageChange('ru')}
              style={{ flex: 1 }}
            >
              🇷🇺 Русский
            </button>
            <button
              className={`tg-button ${language === 'uz' ? 'tg-button-primary' : 'tg-button-secondary'}`}
              onClick={() => handleLanguageChange('uz')}
              style={{ flex: 1 }}
            >
              🇺🇿 O&apos;zbek
            </button>
          </div>
        </div>
      </div>

      {/* Theme info */}
      <div className="tg-section">
        <div className="tg-section-title">Оформление</div>
        <div className="tg-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: 24 }}>{colorScheme === 'dark' ? '🌙' : '☀️'}</div>
            <div>
              <div style={{ fontWeight: 500 }}>
                {colorScheme === 'dark' ? 'Тёмная тема' : 'Светлая тема'}
              </div>
              <div className="tg-hint" style={{ fontSize: 13 }}>
                Тема зависит от настроек Telegram
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* About */}
      <div className="tg-section">
        <div className="tg-section-title">О приложении</div>
        <div className="tg-list">
          <div className="tg-list-item">
            <div className="tg-list-item-content">
              <div className="tg-list-item-title">Версия</div>
            </div>
            <div className="tg-hint">1.0.0</div>
          </div>
          <a
            href="https://vendhub.uz/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="tg-list-item"
            style={{ textDecoration: 'none', color: 'inherit' }}
          >
            <div className="tg-list-item-content">
              <div className="tg-list-item-title">Политика конфиденциальности</div>
            </div>
            <div style={{ color: 'var(--tg-hint-color)' }}>›</div>
          </a>
          <a
            href="https://vendhub.uz/terms"
            target="_blank"
            rel="noopener noreferrer"
            className="tg-list-item"
            style={{ textDecoration: 'none', color: 'inherit' }}
          >
            <div className="tg-list-item-content">
              <div className="tg-list-item-title">Условия использования</div>
            </div>
            <div style={{ color: 'var(--tg-hint-color)' }}>›</div>
          </a>
        </div>
      </div>

      {/* Danger zone */}
      <div className="tg-section">
        <div className="tg-section-title" style={{ color: '#f44336' }}>Опасная зона</div>
        <div className="tg-card">
          <button
            className="tg-button"
            onClick={handleDeleteAccount}
            style={{
              width: '100%',
              backgroundColor: 'rgba(244, 67, 54, 0.1)',
              color: '#f44336',
            }}
          >
            Удалить аккаунт
          </button>
          <div className="tg-hint" style={{ marginTop: 8, fontSize: 12, textAlign: 'center' }}>
            Все ваши данные и бонусы будут удалены
          </div>
        </div>
      </div>

      {/* Switch styles for toggle */}
      <style jsx>{`
        .tg-switch {
          position: relative;
          display: inline-block;
          width: 50px;
          height: 28px;
        }
        .tg-switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }
        .tg-switch-slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: var(--tg-secondary-bg-color);
          transition: 0.3s;
          border-radius: 28px;
        }
        .tg-switch-slider:before {
          position: absolute;
          content: "";
          height: 22px;
          width: 22px;
          left: 3px;
          bottom: 3px;
          background-color: white;
          transition: 0.3s;
          border-radius: 50%;
        }
        .tg-switch input:checked + .tg-switch-slider {
          background-color: var(--tg-button-color);
        }
        .tg-switch input:checked + .tg-switch-slider:before {
          transform: translateX(22px);
        }
      `}</style>
    </div>
  )
}
