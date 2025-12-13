'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Camera, X, Zap, CheckCircle, AlertCircle } from 'lucide-react'

interface QRScannerProps {
  onScan: (data: string) => void
  onClose?: () => void
  continuous?: boolean
}

export function QRScanner({ onScan, onClose, continuous = false }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [scannedData, setScannedData] = useState<string | null>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const scanWithCanvas = useCallback(() => {
    // Simplified canvas-based QR detection
    // In production, you'd use a library like jsQR here
    scanIntervalRef.current = setInterval(() => {
      if (!videoRef.current || !canvasRef.current) {return}

      const video = videoRef.current
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')

      if (!ctx || video.readyState !== video.HAVE_ENOUGH_DATA) {return}

      canvas.width = video.videoWidth
      canvas.height = video.videoHeight

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

      // Note: This is a placeholder. In production, use jsQR or similar library
      // to decode QR codes from canvas imageData
      // const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      // const code = jsQR(imageData.data, imageData.width, imageData.height)
    }, 300)
  }, [])

  const startScanning = useCallback(() => {
    // Check if BarcodeDetector is supported
    if ('BarcodeDetector' in window) {
      // Use BarcodeDetector API
      try {
        // @ts-expect-error - BarcodeDetector is experimental
        const barcodeDetector = new BarcodeDetector({ formats: ['qr_code'] })

        scanIntervalRef.current = setInterval(async () => {
          if (!videoRef.current) {return}

          try {
            const barcodes = await barcodeDetector.detect(videoRef.current)

            if (barcodes.length > 0) {
              const qrCode = barcodes[0].rawValue
              console.log('QR Code scanned:', qrCode)
            }
          } catch (err) {
            console.error('Barcode detection error:', err)
          }
        }, 300)
      } catch (err) {
        console.error('BarcodeDetector error:', err)
        scanWithCanvas()
      }
    } else {
      // Fallback to canvas-based scanning (simplified)
      scanWithCanvas()
    }
  }, [scanWithCanvas])

  const stopCamera = useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current)
      scanIntervalRef.current = null
    }

    if (stream) {
      stream.getTracks().forEach((track) => track.stop())
      setStream(null)
    }

    setIsScanning(false)
  }, [stream])

  const startCamera = useCallback(async () => {
    try {
      setError(null)
      setHasPermission(null)

      // Request camera permission
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Use back camera on mobile
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      })

      setStream(mediaStream)
      setHasPermission(true)

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
        videoRef.current.play()
      }

      // Start scanning after video is ready
      setTimeout(() => {
        setIsScanning(true)
        startScanning()
      }, 500)
    } catch (err: any) {
      console.error('Camera error:', err)
      setHasPermission(false)
      setError(
        err.name === 'NotAllowedError'
          ? 'Доступ к камере запрещен. Разрешите доступ в настройках браузера.'
          : err.name === 'NotFoundError'
          ? 'Камера не найдена'
          : 'Не удалось получить доступ к камере'
      )
    }
  }, [startScanning])

  useEffect(() => {
    startCamera()
    return () => {
      stopCamera()
    }
  }, [startCamera, stopCamera])

  const handleScan = (data: string) => {
    console.log('QR Code scanned:', data)
    setScannedData(data)
    onScan(data)

    if (!continuous) {
      // Stop scanning after first successful scan
      setIsScanning(false)
      setTimeout(() => {
        stopCamera()
        if (onClose) {onClose()}
      }, 1500)
    } else {
      // Brief pause in continuous mode
      setIsScanning(false)
      setTimeout(() => {
        setScannedData(null)
        setIsScanning(true)
      }, 2000)
    }
  }

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="safe-area-inset-top bg-black/80 backdrop-blur-sm p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Camera className="h-6 w-6 text-white" />
          <div>
            <h2 className="text-white font-semibold text-lg">Сканер QR-кода</h2>
            <p className="text-gray-300 text-sm">Наведите на QR-код аппарата</p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={() => {
              stopCamera()
              onClose()
            }}
            className="p-2 rounded-full bg-white/10 active:bg-white/20 touch-manipulation"
          >
            <X className="h-6 w-6 text-white" />
          </button>
        )}
      </div>

      {/* Camera view */}
      <div className="flex-1 relative overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />

        {/* Hidden canvas for fallback scanning */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Scanning overlay */}
        {isScanning && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {/* Scanning frame */}
            <div className="relative w-64 h-64">
              <div className="absolute inset-0 border-2 border-white/50 rounded-2xl">
                {/* Corner indicators */}
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-indigo-500 rounded-tl-2xl" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-indigo-500 rounded-tr-2xl" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-indigo-500 rounded-bl-2xl" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-indigo-500 rounded-br-2xl" />

                {/* Scanning line */}
                <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent animate-scan" />
              </div>

              {/* Center crosshair */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-12 h-12 border-2 border-white/30 rounded-full" />
              </div>
            </div>
          </div>
        )}

        {/* Success indicator */}
        {scannedData && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl p-6 mx-4 max-w-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">QR-код распознан!</h3>
                  <p className="text-sm text-gray-600">Загрузка данных...</p>
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Код аппарата:</p>
                <p className="font-mono text-sm text-gray-900 break-all">{scannedData}</p>
              </div>
            </div>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl p-6 max-w-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertCircle className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Ошибка камеры</h3>
                  <p className="text-sm text-gray-600">{error}</p>
                </div>
              </div>

              {hasPermission === false && (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600">
                    Для сканирования QR-кодов необходим доступ к камере.
                  </p>
                  <ol className="text-sm text-gray-600 space-y-2 list-decimal list-inside">
                    <li>Откройте настройки браузера</li>
                    <li>Найдите раздел "Разрешения" или "Права доступа"</li>
                    <li>Разрешите доступ к камере для этого сайта</li>
                    <li>Обновите страницу</li>
                  </ol>
                </div>
              )}

              <button
                onClick={() => {
                  stopCamera()
                  if (onClose) {onClose()}
                }}
                className="mt-4 w-full bg-gray-900 text-white px-4 py-3 rounded-lg font-medium active:bg-gray-800 touch-manipulation"
              >
                Закрыть
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom info */}
      <div className="safe-area-inset-bottom bg-black/80 backdrop-blur-sm p-4">
        <div className="flex items-center justify-center gap-2 text-white/80 text-sm">
          <Zap className="h-4 w-4" />
          <span>Держите камеру на расстоянии 10-20 см от QR-кода</span>
        </div>
      </div>

      <style jsx>{`
        @keyframes scan {
          0% {
            top: 0;
          }
          50% {
            top: 100%;
          }
          100% {
            top: 0;
          }
        }

        .animate-scan {
          animation: scan 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}
