'use client'

import React, { useEffect, useState } from 'react'
import { telegramApi } from '@/lib/telegram-api'
import type { BotInfo, TelegramStatistics, MyTelegramAccount } from '@/types/telegram'
import { Bot, Link as LinkIcon, Users, CheckCircle, XCircle, Send, Settings } from 'lucide-react'
import Link from 'next/link'

export default function TelegramPage() {
  const [botInfo, setBotInfo] = useState<BotInfo | null>(null)
  const [statistics, setStatistics] = useState<TelegramStatistics | null>(null)
  const [myAccount, setMyAccount] = useState<MyTelegramAccount | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [botInfoData, statsData, accountData] = await Promise.all([
        telegramApi.getBotInfo(),
        telegramApi.getUserStatistics(),
        telegramApi.getMyAccount(),
      ])

      setBotInfo(botInfoData)
      setStatistics(statsData)
      setMyAccount(accountData)
    } catch (error) {
      console.error('Failed to fetch Telegram data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Telegram Integration</h1>
          <p className="text-gray-600 mt-1">
            Получайте уведомления и управляйте машинами через Telegram
          </p>
        </div>
        <Link
          href="/telegram/settings"
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
        >
          <Settings className="h-5 w-5" />
          Настройки бота
        </Link>
      </div>

      {/* Bot Status Card */}
      <div className="backdrop-blur-md bg-white/90 rounded-xl shadow-lg border border-gray-200 p-6">
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-lg ${botInfo?.is_active ? 'bg-green-100' : 'bg-gray-100'}`}>
            <Bot className={`h-8 w-8 ${botInfo?.is_active ? 'text-green-600' : 'text-gray-400'}`} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold text-gray-900">Telegram Bot</h2>
              {botInfo?.is_active ? (
                <span className="flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                  <CheckCircle className="h-4 w-4" />
                  Активен
                </span>
              ) : (
                <span className="flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
                  <XCircle className="h-4 w-4" />
                  Неактивен
                </span>
              )}
            </div>

            {botInfo?.is_configured ? (
              <div className="mt-3 space-y-2">
                <p className="text-gray-600">
                  Username: <span className="font-mono text-blue-600">@{botInfo.bot_username}</span>
                </p>
                <p className="text-gray-600">
                  Уведомления: {botInfo.send_notifications ? '✅ Включены' : '❌ Выключены'}
                </p>
              </div>
            ) : (
              <div className="mt-3">
                <p className="text-gray-600">
                  Бот не настроен. Перейдите в настройки для конфигурации.
                </p>
                <Link
                  href="/telegram/settings"
                  className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  <Settings className="h-4 w-4" />
                  Настроить бота
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* My Account Card */}
        <div className="backdrop-blur-md bg-white/90 rounded-xl shadow-lg border border-gray-200 p-6">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-lg ${myAccount?.linked && myAccount?.verified ? 'bg-blue-100' : 'bg-gray-100'}`}>
              <LinkIcon className={`h-8 w-8 ${myAccount?.linked && myAccount?.verified ? 'text-blue-600' : 'text-gray-400'}`} />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900">Ваш аккаунт</h3>

              {myAccount?.linked && myAccount?.verified ? (
                <div className="mt-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="text-green-700 font-medium">Telegram подключен</span>
                  </div>
                  {myAccount.telegram_user && (
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>
                        Имя: {myAccount.telegram_user.first_name} {myAccount.telegram_user.last_name}
                      </p>
                      {myAccount.telegram_user.username && (
                        <p>Username: @{myAccount.telegram_user.username}</p>
                      )}
                      <p>Язык: {myAccount.telegram_user.language === 'ru' ? '🇷🇺 Русский' : '🇬🇧 English'}</p>
                    </div>
                  )}
                  <div className="flex gap-2 mt-4">
                    <Link
                      href="/telegram/link"
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
                    >
                      Настроить уведомления
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="mt-3">
                  <p className="text-gray-600 mb-4">
                    Telegram не подключен к вашему аккаунту
                  </p>
                  <Link
                    href="/telegram/link"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-lg transition-all shadow-lg"
                  >
                    <LinkIcon className="h-4 w-4" />
                    Подключить Telegram
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Statistics Card */}
        <div className="backdrop-blur-md bg-white/90 rounded-xl shadow-lg border border-gray-200 p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-purple-100">
              <Users className="h-8 w-8 text-purple-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900">Статистика</h3>

              {statistics && (
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{statistics.total}</p>
                    <p className="text-sm text-gray-600">Всего пользователей</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-600">{statistics.verified}</p>
                    <p className="text-sm text-gray-600">Подтверждённых</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-blue-600">{statistics.active}</p>
                    <p className="text-sm text-gray-600">Активных</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-orange-600">{statistics.unverified}</p>
                    <p className="text-sm text-gray-600">Не подтверждённых</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        <FeatureCard
          icon={<Send className="h-6 w-6" />}
          title="Уведомления в реальном времени"
          description="Получайте мгновенные уведомления о состоянии машин, низком запасе и других важных событиях"
        />
        <FeatureCard
          icon={<Bot className="h-6 w-6" />}
          title="Интерактивное управление"
          description="Используйте удобное меню с кнопками для быстрого доступа к информации о машинах"
        />
        <FeatureCard
          icon={<CheckCircle className="h-6 w-6" />}
          title="Персонализация"
          description="Настройте типы уведомлений и язык интерфейса под свои предпочтения"
        />
      </div>

      {/* Quick Start Guide */}
      {botInfo?.is_configured && (!myAccount?.linked || !myAccount?.verified) && (
        <div className="backdrop-blur-md bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl shadow-lg border border-blue-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            🚀 Быстрый старт
          </h3>
          <ol className="space-y-3 text-gray-700">
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">1</span>
              <div>
                <p className="font-medium">Откройте Telegram</p>
                <p className="text-sm text-gray-600">Найдите бота @{botInfo.bot_username} или перейдите по ссылке</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">2</span>
              <div>
                <p className="font-medium">Получите код подтверждения</p>
                <p className="text-sm text-gray-600">Нажмите кнопку "Подключить Telegram" на этой странице</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">3</span>
              <div>
                <p className="font-medium">Отправьте код боту</p>
                <p className="text-sm text-gray-600">Бот подтвердит связь вашего аккаунта</p>
              </div>
            </li>
          </ol>
          <Link
            href="/telegram/link"
            className="inline-flex items-center gap-2 mt-6 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-lg transition-all shadow-lg font-medium"
          >
            <LinkIcon className="h-5 w-5" />
            Начать подключение
          </Link>
        </div>
      )}
    </div>
  )
}

interface FeatureCardProps {
  icon: React.ReactNode
  title: string
  description: string
}

function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <div className="backdrop-blur-md bg-white/90 rounded-xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-shadow">
      <div className="p-3 bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg inline-block mb-4">
        <div className="text-blue-600">{icon}</div>
      </div>
      <h4 className="text-lg font-semibold text-gray-900 mb-2">{title}</h4>
      <p className="text-gray-600 text-sm">{description}</p>
    </div>
  )
}
