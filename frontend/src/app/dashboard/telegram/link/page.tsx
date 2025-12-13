'use client'

import React, { useEffect, useState, useCallback } from 'react'
import Image from 'next/image'
import { telegramApi } from '@/lib/telegram-api'
import type { MyTelegramAccount, VerificationCodeResponse, NotificationPreferences } from '@/types/telegram'
import { QrCode, Copy, CheckCircle, RefreshCw, Send, Bell, BellOff, Link as LinkIcon, Unlink } from 'lucide-react'
import QRCode from 'qrcode'
import { NotificationTypeLabels } from '@/types/telegram'

export default function TelegramLinkPage() {
  const [myAccount, setMyAccount] = useState<MyTelegramAccount | null>(null)
  const [verificationData, setVerificationData] = useState<VerificationCodeResponse | null>(null)
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [botUsername, setBotUsername] = useState<string>('')

  const generateCode = useCallback(async () => {
    try {
      const data = await telegramApi.generateVerificationCode()
      setVerificationData(data)

      // Generate QR code for bot link
      const botUrl = `https://t.me/${botUsername}?start=${data.verification_code}`
      const qr = await QRCode.toDataURL(botUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      })
      setQrCodeUrl(qr)
    } catch (error) {
      console.error('Failed to generate code:', error)
    }
  }, [botUsername])

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const [accountData, botInfo] = await Promise.all([
        telegramApi.getMyAccount(),
        telegramApi.getBotInfo(),
      ])

      setMyAccount(accountData)

      if (botInfo.bot_username) {
        setBotUsername(botInfo.bot_username)
      }

      // If not linked, generate verification code
      if (!accountData.linked || !accountData.verified) {
        await generateCode()
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }, [generateCode])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const copyCode = () => {
    if (verificationData) {
      navigator.clipboard.writeText(verificationData.verification_code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleUnlink = async () => {
    if (!confirm('Вы уверены, что хотите отключить Telegram от вашего аккаунта?')) {
      return
    }

    try {
      await telegramApi.unlinkMyAccount()
      await fetchData()
    } catch (error) {
      console.error('Failed to unlink account:', error)
    }
  }

  const toggleNotification = async (key: string) => {
    if (!myAccount?.telegram_user) {return}

    const newPrefs = {
      ...myAccount.telegram_user.notification_preferences,
      [key]: !myAccount.telegram_user.notification_preferences[key],
    }

    try {
      await telegramApi.updateUser(myAccount.telegram_user.id, {
        notification_preferences: newPrefs,
      })

      // Refresh data
      await fetchData()
    } catch (error) {
      console.error('Failed to update notifications:', error)
    }
  }

  const sendTestNotification = async () => {
    if (!myAccount?.telegram_user) {return}

    try {
      await telegramApi.sendTestNotification(myAccount.telegram_user.user_id)
      alert('Тестовое уведомление отправлено! Проверьте Telegram.')
    } catch (error) {
      console.error('Failed to send test notification:', error)
      alert('Не удалось отправить тестовое уведомление')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    )
  }

  // If linked and verified, show settings
  if (myAccount?.linked && myAccount?.verified && myAccount?.telegram_user) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Настройки Telegram</h1>
          <p className="text-gray-600 mt-1">
            Управляйте уведомлениями и настройками аккаунта
          </p>
        </div>

        {/* Account Info */}
        <div className="backdrop-blur-md bg-white/90 rounded-xl shadow-lg border border-gray-200 p-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <CheckCircle className="h-6 w-6 text-green-600" />
                <h2 className="text-xl font-semibold text-gray-900">Telegram подключен</h2>
              </div>

              <div className="space-y-2 text-gray-700">
                <p>
                  <span className="font-medium">Имя:</span>{' '}
                  {myAccount.telegram_user.first_name} {myAccount.telegram_user.last_name}
                </p>
                {myAccount.telegram_user.username && (
                  <p>
                    <span className="font-medium">Username:</span> @{myAccount.telegram_user.username}
                  </p>
                )}
                <p>
                  <span className="font-medium">Язык:</span>{' '}
                  {myAccount.telegram_user.language === 'ru' ? '🇷🇺 Русский' : '🇬🇧 English'}
                </p>
              </div>
            </div>

            <button
              onClick={handleUnlink}
              className="flex items-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg transition-colors"
            >
              <Unlink className="h-4 w-4" />
              Отключить
            </button>
          </div>

          <button
            onClick={sendTestNotification}
            className="flex items-center gap-2 px-4 py-2 mt-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Send className="h-4 w-4" />
            Отправить тестовое уведомление
          </button>
        </div>

        {/* Notification Preferences */}
        <div className="backdrop-blur-md bg-white/90 rounded-xl shadow-lg border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Настройки уведомлений</h2>
          <p className="text-gray-600 mb-6">
            Выберите типы уведомлений, которые вы хотите получать в Telegram
          </p>

          <div className="space-y-3">
            {Object.entries(NotificationTypeLabels).map(([key, label]) => {
              const isEnabled = myAccount.telegram_user!.notification_preferences[key] !== false

              return (
                <button
                  key={key}
                  onClick={() => toggleNotification(key)}
                  className={`w-full flex items-center justify-between p-4 rounded-lg transition-all ${
                    isEnabled
                      ? 'bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200'
                      : 'bg-gray-50 border-2 border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {isEnabled ? (
                      <Bell className="h-5 w-5 text-blue-600" />
                    ) : (
                      <BellOff className="h-5 w-5 text-gray-400" />
                    )}
                    <span className={`font-medium ${isEnabled ? 'text-gray-900' : 'text-gray-500'}`}>
                      {label}
                    </span>
                  </div>
                  <div
                    className={`w-12 h-6 rounded-full transition-colors relative ${
                      isEnabled ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                  >
                    <div
                      className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                        isEnabled ? 'translate-x-6' : 'translate-x-0'
                      }`}
                    />
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  // If not linked, show linking interface
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">Подключить Telegram</h1>
        <p className="text-gray-600 mt-2">
          Получайте уведомления и управляйте машинами прямо из Telegram
        </p>
      </div>

      {/* QR Code & Instructions */}
      <div className="backdrop-blur-md bg-white/90 rounded-xl shadow-lg border border-gray-200 p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* QR Code */}
          <div className="flex flex-col items-center">
            <div className="p-4 bg-white rounded-xl shadow-md mb-4">
              {qrCodeUrl ? (
                <Image src={qrCodeUrl} alt="QR Code" width={256} height={256} unoptimized />
              ) : (
                <div className="w-64 h-64 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
                </div>
              )}
            </div>
            <p className="text-sm text-gray-600 text-center">
              Отсканируйте QR-код в Telegram
            </p>
          </div>

          {/* Instructions */}
          <div className="flex flex-col justify-center">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              Способ 1: QR-код
            </h3>
            <ol className="space-y-3 text-gray-700 mb-6">
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                  1
                </span>
                <span>Откройте Telegram на телефоне</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                  2
                </span>
                <span>Отсканируйте QR-код</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                  3
                </span>
                <span>Нажмите "Start" в боте</span>
              </li>
            </ol>

            <div className="border-t pt-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                Способ 2: Код подтверждения
              </h3>
              <ol className="space-y-3 text-gray-700">
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                    1
                  </span>
                  <span>
                    Откройте бота{' '}
                    <a
                      href={`https://t.me/${botUsername}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline font-mono"
                    >
                      @{botUsername}
                    </a>
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                    2
                  </span>
                  <span>Отправьте код подтверждения боту</span>
                </li>
              </ol>
            </div>
          </div>
        </div>

        {/* Verification Code */}
        {verificationData && (
          <div className="mt-8 pt-8 border-t">
            <div className="text-center">
              <p className="text-gray-600 mb-3">Ваш код подтверждения:</p>
              <div className="flex items-center justify-center gap-3">
                <div className="px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white text-3xl font-mono font-bold rounded-lg shadow-lg">
                  {verificationData.verification_code}
                </div>
                <button
                  onClick={copyCode}
                  className="p-3 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  title="Copy code"
                >
                  {copied ? (
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  ) : (
                    <Copy className="h-6 w-6 text-gray-600" />
                  )}
                </button>
              </div>
              <p className="text-sm text-gray-500 mt-3">
                Код действителен в течение 24 часов
              </p>
            </div>

            <div className="flex justify-center gap-4 mt-6">
              <a
                href={`https://t.me/${botUsername}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg transition-all shadow-lg font-medium"
              >
                <LinkIcon className="h-5 w-5" />
                Открыть Telegram бота
              </a>
              <button
                onClick={generateCode}
                className="flex items-center gap-2 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
              >
                <RefreshCw className="h-5 w-5" />
                Обновить код
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <FeatureBox
          icon="🔔"
          title="Мгновенные уведомления"
          description="Получайте уведомления о важных событиях в реальном времени"
        />
        <FeatureBox
          icon="🎯"
          title="Удобное меню"
          description="Интерактивные кнопки для быстрого доступа ко всем функциям"
        />
        <FeatureBox
          icon="🌐"
          title="Мультиязычность"
          description="Поддержка русского и английского языков"
        />
      </div>
    </div>
  )
}

interface FeatureBoxProps {
  icon: string
  title: string
  description: string
}

function FeatureBox({ icon, title, description }: FeatureBoxProps) {
  return (
    <div className="backdrop-blur-md bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl border border-blue-200 p-6">
      <div className="text-4xl mb-3">{icon}</div>
      <h4 className="font-semibold text-gray-900 mb-2">{title}</h4>
      <p className="text-sm text-gray-600">{description}</p>
    </div>
  )
}
