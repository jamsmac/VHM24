'use client'

import { useState } from 'react'
import { Shield, Smartphone, Copy, Check, Loader2, AlertTriangle } from 'lucide-react'
import { twoFactorApi, TwoFactorSetupResponse } from '@/lib/two-factor-api'

interface TwoFactorSetupProps {
  userId: string
  email: string
  onSuccess: () => void
  onCancel: () => void
}

type SetupStep = 'intro' | 'qrcode' | 'verify' | 'backup' | 'complete'

export function TwoFactorSetup({ userId, email, onSuccess, onCancel }: TwoFactorSetupProps) {
  const [step, setStep] = useState<SetupStep>('intro')
  const [setupData, setSetupData] = useState<TwoFactorSetupResponse | null>(null)
  const [verificationCode, setVerificationCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copiedSecret, setCopiedSecret] = useState(false)
  const [backupCodesCopied, setBackupCodesCopied] = useState(false)

  const handleStartSetup = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const data = await twoFactorApi.setup(userId, email)
      setSetupData(data)
      setStep('qrcode')
    } catch (err) {
      setError('Не удалось начать настройку 2FA. Попробуйте позже.')
      console.error('2FA setup error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerifyCode = async () => {
    if (verificationCode.length !== 6) {
      setError('Код должен содержать 6 цифр')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await twoFactorApi.enable(userId, verificationCode)
      if (result.verified) {
        setStep('backup')
      } else {
        setError('Неверный код. Проверьте время на устройстве и попробуйте снова.')
      }
    } catch (err) {
      setError('Ошибка проверки кода. Попробуйте снова.')
      console.error('2FA verify error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const copyToClipboard = async (text: string, type: 'secret' | 'backup') => {
    try {
      await navigator.clipboard.writeText(text)
      if (type === 'secret') {
        setCopiedSecret(true)
        setTimeout(() => setCopiedSecret(false), 2000)
      } else {
        setBackupCodesCopied(true)
        setTimeout(() => setBackupCodesCopied(false), 2000)
      }
    } catch {
      console.error('Failed to copy to clipboard')
    }
  }

  const handleComplete = () => {
    setStep('complete')
    setTimeout(() => {
      onSuccess()
    }, 2000)
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 max-w-md mx-auto">
      {/* Step: Introduction */}
      {step === 'intro' && (
        <div className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
            <Shield className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900">
            Настройка двухфакторной аутентификации
          </h2>
          <p className="text-gray-600">
            Двухфакторная аутентификация добавляет дополнительный уровень защиты вашей учётной записи.
            Вам понадобится приложение-аутентификатор, например Google Authenticator или Authy.
          </p>

          <div className="bg-blue-50 rounded-lg p-4 text-left">
            <h3 className="font-medium text-blue-900 mb-2">Вам понадобится:</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li className="flex items-center gap-2">
                <Smartphone className="w-4 h-4" />
                Смартфон с приложением-аутентификатором
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4" />
                Google Authenticator, Authy или аналогичное приложение
              </li>
            </ul>
          </div>

          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Отмена
            </button>
            <button
              onClick={handleStartSetup}
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Загрузка...
                </>
              ) : (
                'Начать настройку'
              )}
            </button>
          </div>
        </div>
      )}

      {/* Step: QR Code */}
      {step === 'qrcode' && setupData && (
        <div className="space-y-4">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Отсканируйте QR-код
            </h2>
            <p className="text-gray-600 text-sm">
              Откройте приложение-аутентификатор и отсканируйте этот QR-код
            </p>
          </div>

          {/* QR Code */}
          <div className="flex justify-center">
            <div className="p-4 bg-white border-2 border-gray-200 rounded-lg">
              <img
                src={setupData.qrCodeUrl}
                alt="QR Code для 2FA"
                className="w-48 h-48"
              />
            </div>
          </div>

          {/* Manual entry option */}
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-2">
              Или введите код вручную:
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-white px-3 py-2 rounded border border-gray-200 text-sm font-mono break-all">
                {setupData.secret}
              </code>
              <button
                onClick={() => copyToClipboard(setupData.secret, 'secret')}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                title="Копировать"
              >
                {copiedSecret ? (
                  <Check className="w-4 h-4 text-green-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <button
            onClick={() => setStep('verify')}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Продолжить
          </button>
        </div>
      )}

      {/* Step: Verify */}
      {step === 'verify' && (
        <div className="space-y-4">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Введите код подтверждения
            </h2>
            <p className="text-gray-600 text-sm">
              Введите 6-значный код из приложения-аутентификатора
            </p>
          </div>

          <div>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={verificationCode}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '')
                setVerificationCode(value)
                setError(null)
              }}
              placeholder="000000"
              className="w-full text-center text-2xl tracking-[0.5em] font-mono px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              autoFocus
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => setStep('qrcode')}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Назад
            </button>
            <button
              onClick={handleVerifyCode}
              disabled={isLoading || verificationCode.length !== 6}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Проверка...
                </>
              ) : (
                'Подтвердить'
              )}
            </button>
          </div>
        </div>
      )}

      {/* Step: Backup Codes */}
      {step === 'backup' && setupData && (
        <div className="space-y-4">
          <div className="text-center">
            <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-3">
              <Check className="w-6 h-6 text-green-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Сохраните резервные коды
            </h2>
            <p className="text-gray-600 text-sm">
              Эти коды можно использовать для входа, если вы потеряете доступ к аутентификатору.
              Каждый код можно использовать только один раз.
            </p>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-yellow-800">
                Сохраните эти коды в надёжном месте. Они не будут показаны снова!
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-3">
              {setupData.backupCodes.map((code, index) => (
                <code
                  key={index}
                  className="bg-white px-3 py-2 rounded border border-yellow-200 text-sm font-mono text-center"
                >
                  {code}
                </code>
              ))}
            </div>

            <button
              onClick={() => copyToClipboard(setupData.backupCodes.join('\n'), 'backup')}
              className="w-full px-3 py-2 text-sm border border-yellow-300 rounded-lg text-yellow-800 hover:bg-yellow-100 flex items-center justify-center gap-2"
            >
              {backupCodesCopied ? (
                <>
                  <Check className="w-4 h-4" />
                  Скопировано!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Копировать все коды
                </>
              )}
            </button>
          </div>

          <button
            onClick={handleComplete}
            className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Я сохранил коды, завершить
          </button>
        </div>
      )}

      {/* Step: Complete */}
      {step === 'complete' && (
        <div className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900">
            2FA успешно настроена!
          </h2>
          <p className="text-gray-600">
            Ваша учётная запись теперь защищена двухфакторной аутентификацией.
          </p>
        </div>
      )}
    </div>
  )
}

export default TwoFactorSetup
