'use client'

import { useState, useRef, useEffect } from 'react'
import { QrCode, X, Camera } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog'
import { componentsApi } from '@/lib/equipment-api'
import { getErrorMessage } from '@/lib/utils'
import type { EquipmentComponent } from '@/types/equipment'

interface QRScannerProps {
  isOpen: boolean
  onClose: () => void
  onScanSuccess: (component: EquipmentComponent) => void
}

export function QRScanner({ isOpen, onClose, onScanSuccess }: QRScannerProps) {
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [manualCode, setManualCode] = useState('')
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    if (isOpen && scanning) {
      startCamera()
    }
    return () => {
      stopCamera()
    }
  }, [isOpen, scanning])

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        streamRef.current = stream
      }
    } catch (err) {
      setError('Не удалось получить доступ к камере')
      console.error('Camera access error:', err)
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
  }

  const handleManualSearch = async () => {
    if (!manualCode.trim()) {return}

    try {
      setError(null)
      // Try to find component by serial number or ID
      const component = await componentsApi.getById(manualCode.trim())
      onScanSuccess(component)
      onClose()
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Компонент не найден'))
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Сканировать QR код компонента</DialogTitle>
        </DialogHeader>
      <div className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 p-4 text-sm text-red-800 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)}>
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Camera View */}
        {scanning ? (
          <div className="relative">
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full rounded-lg bg-black"
              style={{ maxHeight: '400px' }}
              aria-label="Camera preview for QR scanning"
            />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-64 h-64 border-4 border-indigo-500 rounded-lg animate-pulse" />
            </div>
            <button
              onClick={() => {
                setScanning(false)
                stopCamera()
              }}
              className="absolute top-4 right-4 p-2 bg-white/90 rounded-full hover:bg-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 bg-gray-50 rounded-lg">
            <QrCode className="h-24 w-24 text-gray-400 mb-4" />
            <p className="text-gray-600 mb-4">Наведите камеру на QR код компонента</p>
            <button
              onClick={() => setScanning(true)}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all"
            >
              <Camera className="h-5 w-5" />
              Включить камеру
            </button>
          </div>
        )}

        {/* Manual Entry */}
        <div className="border-t border-gray-200 pt-4">
          <p className="text-sm text-gray-600 mb-3">Или введите код вручную:</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {handleManualSearch()}
              }}
              placeholder="Введите серийный номер или ID"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <button
              onClick={handleManualSearch}
              disabled={!manualCode.trim()}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Найти
            </button>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>Совет:</strong> QR коды можно сгенерировать для каждого компонента и наклеить
            на оборудование для быстрого доступа к информации.
          </p>
        </div>
      </div>
      </DialogContent>
    </Dialog>
  )
}

// QR Code Generator Component
export function generateComponentQRCode(componentId: string): string {
  // This would use a QR code generation library like qrcode.react
  // For now, return a placeholder
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${componentId}`
}
