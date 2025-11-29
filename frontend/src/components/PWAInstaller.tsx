'use client'

import { useEffect, useState } from 'react'
import { toast } from 'react-toastify'

export function PWAInstaller() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [isInstallable, setIsInstallable] = useState(false)
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/service-worker.js')
        .then((registration) => {
          console.log('SW registered:', registration)

          // Check for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  toast.info('Доступно обновление приложения. Обновите страницу.', {
                    autoClose: false,
                    onClick: () => window.location.reload(),
                  })
                }
              })
            }
          })
        })
        .catch((error) => {
          console.error('SW registration failed:', error)
        })
    }

    // Handle install prompt
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setIsInstallable(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // Handle online/offline status
    const handleOnline = () => {
      setIsOnline(true)
      toast.success('Соединение восстановлено', {
        autoClose: 3000,
      })
    }

    const handleOffline = () => {
      setIsOnline(false)
      toast.warning('Нет соединения. Работаем в offline режиме.', {
        autoClose: 5000,
      })
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Check initial online status
    setIsOnline(navigator.onLine)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      return
    }

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === 'accepted') {
      console.log('PWA installed')
      toast.success('Приложение установлено!')
    }

    setDeferredPrompt(null)
    setIsInstallable(false)
  }

  return (
    <>
      {/* Install banner */}
      {isInstallable && (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-indigo-600 text-white rounded-lg shadow-lg p-4 z-50">
          <div className="flex items-start gap-3">
            <div className="text-2xl">📱</div>
            <div className="flex-1">
              <h3 className="font-semibold mb-1">Установите приложение</h3>
              <p className="text-sm text-indigo-100 mb-3">
                Добавьте VendHub на главный экран для быстрого доступа
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleInstallClick}
                  className="bg-white text-indigo-600 px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-50 transition-colors"
                >
                  Установить
                </button>
                <button
                  onClick={() => setIsInstallable(false)}
                  className="bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-800 transition-colors"
                >
                  Позже
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Offline indicator */}
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 bg-orange-500 text-white px-4 py-2 text-center text-sm font-medium z-50">
          <span className="inline-flex items-center gap-2">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
            Offline режим - данные будут синхронизированы при подключении
          </span>
        </div>
      )}
    </>
  )
}
