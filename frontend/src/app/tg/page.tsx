'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useTelegram } from './components/TelegramProvider'
import { QRScanner } from './components/QRScanner'
import Link from 'next/link'

interface RecentMachine {
  id: string
  name: string
  machine_number: string
  location_name?: string
  last_visited: string
}

export default function TelegramMiniAppHome() {
  const router = useRouter()
  const { user, isReady, isAuthenticated, authenticate, hapticFeedback } = useTelegram()
  const [isLoading, setIsLoading] = useState(true)
  const [recentMachines, setRecentMachines] = useState<RecentMachine[]>([])
  const [showScanner, setShowScanner] = useState(false)

  // Authenticate on mount
  useEffect(() => {
    if (isReady && !isAuthenticated) {
      authenticate().then((success) => {
        setIsLoading(false)
        if (!success) {
          console.error('Authentication failed')
        }
      })
    } else if (isReady) {
      setIsLoading(false)
      // Load recent machines from localStorage
      const stored = localStorage.getItem('recent_machines')
      if (stored) {
        try {
          setRecentMachines(JSON.parse(stored))
        } catch {
          // ignore
        }
      }
    }
  }, [isReady, isAuthenticated, authenticate])

  const handleScanQR = useCallback(() => {
    hapticFeedback?.impactOccurred('medium')
    setShowScanner(true)
  }, [hapticFeedback])

  const handleQRScan = useCallback((data: string) => {
    setShowScanner(false)
    // Extract machine number from QR data
    // QR might contain URL like "https://vendhub.uz/m/VM-001" or just "VM-001"
    let machineNumber = data
    if (data.includes('/m/')) {
      machineNumber = data.split('/m/').pop() || data
    } else if (data.includes('/menu?machine=')) {
      const url = new URL(data)
      machineNumber = url.searchParams.get('machine') || data
    }
    router.push(`/tg/menu?machine=${machineNumber}`)
  }, [router])

  const handleMachineClick = useCallback((machineNumber: string) => {
    hapticFeedback?.selectionChanged()
    router.push(`/tg/menu?machine=${machineNumber}`)
  }, [hapticFeedback, router])

  if (isLoading) {
    return (
      <div className="tg-app" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div className="tg-skeleton" style={{ width: 48, height: 48, borderRadius: '50%' }} />
      </div>
    )
  }

  return (
    <div className="tg-app tg-bottom-safe">
      {/* QR Scanner overlay */}
      {showScanner && (
        <QRScanner
          onScan={handleQRScan}
          onClose={() => setShowScanner(false)}
          onError={(error) => console.error('QR Scanner error:', error)}
        />
      )}

      {/* Header */}
      <div className="tg-section" style={{ textAlign: 'center', paddingTop: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>
          VendHub
        </h1>
        {user && (
          <p className="tg-hint">
            {user.first_name}
          </p>
        )}
      </div>

      {/* Scan QR Button */}
      <div className="tg-section">
        <button
          className="tg-button tg-button-primary"
          onClick={handleScanQR}
          style={{ height: 56, fontSize: 17 }}
        >
          <span style={{ marginRight: 8 }}>📷</span>
          Сканировать QR автомата
        </button>
      </div>

      {/* Recent Machines */}
      {recentMachines.length > 0 && (
        <div className="tg-section">
          <div className="tg-section-title">Недавние автоматы</div>
          <ul className="tg-list">
            {recentMachines.map((machine) => (
              <li
                key={machine.id}
                className="tg-list-item"
                onClick={() => handleMachineClick(machine.machine_number)}
                style={{ cursor: 'pointer' }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500 }}>{machine.name}</div>
                  <div className="tg-hint" style={{ fontSize: 13 }}>
                    {machine.location_name || machine.machine_number}
                  </div>
                </div>
                <span style={{ color: 'var(--tg-hint-color)' }}>→</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Quick Links */}
      <div className="tg-section">
        <div className="tg-section-title">Быстрые действия</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Link href="/tg/profile/bonuses" style={{ textDecoration: 'none' }}>
            <div className="tg-card" style={{ textAlign: 'center', cursor: 'pointer' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🎁</div>
              <div style={{ fontWeight: 500, color: 'var(--tg-text-color)' }}>Мои бонусы</div>
            </div>
          </Link>
          <Link href="/tg/profile/history" style={{ textDecoration: 'none' }}>
            <div className="tg-card" style={{ textAlign: 'center', cursor: 'pointer' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
              <div style={{ fontWeight: 500, color: 'var(--tg-text-color)' }}>История</div>
            </div>
          </Link>
        </div>
      </div>

      {/* Profile Link */}
      <div className="tg-section">
        <Link href="/tg/profile" style={{ textDecoration: 'none' }}>
          <div className="tg-list-item" style={{ cursor: 'pointer' }}>
            <div style={{ fontSize: 24, marginRight: 12 }}>👤</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 500, color: 'var(--tg-text-color)' }}>Мой профиль</div>
              <div className="tg-hint" style={{ fontSize: 13 }}>Настройки и данные</div>
            </div>
            <span style={{ color: 'var(--tg-hint-color)' }}>→</span>
          </div>
        </Link>
      </div>
    </div>
  )
}
