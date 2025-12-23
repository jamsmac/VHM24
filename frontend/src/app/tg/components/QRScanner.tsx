'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useTelegram } from './TelegramProvider'

interface QRScannerProps {
  onScan: (data: string) => void
  onError?: (error: string) => void
  onClose?: () => void
}

/**
 * QR Scanner component that uses Telegram's native scanner when available,
 * or falls back to camera-based scanning for development
 */
export function QRScanner({ onScan, onError, onClose }: QRScannerProps) {
  const { webApp, hapticFeedback } = useTelegram()
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [hasCamera, setHasCamera] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const animationRef = useRef<number | null>(null)

  // Use Telegram's native QR scanner if available
  const useTelegramScanner = useCallback(() => {
    if (webApp && typeof webApp.showScanQrPopup === 'function') {
      webApp.showScanQrPopup(
        { text: 'Наведите камеру на QR-код автомата' },
        (data: string) => {
          if (data) {
            hapticFeedback?.notificationOccurred('success')
            onScan(data)
            return true // Close popup
          }
          return false // Continue scanning
        }
      )
      return true
    }
    return false
  }, [webApp, hapticFeedback, onScan])

  // Initialize camera for fallback scanning
  const initCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      })

      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        setHasCamera(true)
        setIsScanning(true)
      }
    } catch (error) {
      console.error('Camera error:', error)
      setCameraError('Не удалось получить доступ к камере')
      onError?.('Camera access denied')
    }
  }, [onError])

  // Stop camera
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }
    setIsScanning(false)
    setHasCamera(false)
  }, [])

  // Scan QR code from video frame (simplified - in production use jsQR or similar)
  const scanFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !isScanning) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    if (!ctx || video.readyState !== video.HAVE_ENOUGH_DATA) {
      animationRef.current = requestAnimationFrame(scanFrame)
      return
    }

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    // In production, use jsQR library here:
    // const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    // const code = jsQR(imageData.data, imageData.width, imageData.height)
    // if (code) { onScan(code.data); return; }

    animationRef.current = requestAnimationFrame(scanFrame)
  }, [isScanning])

  // Start scanning
  useEffect(() => {
    // Try Telegram native scanner first
    if (useTelegramScanner()) {
      return
    }

    // Fallback to camera
    initCamera()

    return () => {
      stopCamera()
    }
  }, [useTelegramScanner, initCamera, stopCamera])

  // Run frame scanning when camera is ready
  useEffect(() => {
    if (isScanning && hasCamera) {
      scanFrame()
    }
  }, [isScanning, hasCamera, scanFrame])

  // For development: manual input
  const handleManualInput = () => {
    const machineId = prompt('Введите номер автомата (например: VM-001):')
    if (machineId) {
      hapticFeedback?.notificationOccurred('success')
      onScan(machineId)
    }
  }

  // If using Telegram native scanner, show nothing (popup is shown)
  if (webApp && typeof webApp.showScanQrPopup === 'function') {
    return null
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#000',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: 'rgba(0,0,0,0.5)',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 10,
        }}
      >
        <button
          onClick={() => {
            stopCamera()
            onClose?.()
          }}
          style={{
            background: 'none',
            border: 'none',
            color: '#fff',
            fontSize: 16,
            cursor: 'pointer',
            padding: '8px 16px',
          }}
        >
          ✕ Закрыть
        </button>
      </div>

      {/* Camera view */}
      {hasCamera && (
        <>
          <video
            ref={videoRef}
            style={{
              flex: 1,
              objectFit: 'cover',
            }}
            playsInline
            muted
          />
          <canvas ref={canvasRef} style={{ display: 'none' }} />

          {/* Scanning overlay */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 250,
              height: 250,
              border: '3px solid var(--tg-button-color, #007AFF)',
              borderRadius: 20,
              boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)',
            }}
          >
            {/* Corner markers */}
            <div
              style={{
                position: 'absolute',
                top: -3,
                left: -3,
                width: 30,
                height: 30,
                borderTop: '5px solid #fff',
                borderLeft: '5px solid #fff',
                borderRadius: '10px 0 0 0',
              }}
            />
            <div
              style={{
                position: 'absolute',
                top: -3,
                right: -3,
                width: 30,
                height: 30,
                borderTop: '5px solid #fff',
                borderRight: '5px solid #fff',
                borderRadius: '0 10px 0 0',
              }}
            />
            <div
              style={{
                position: 'absolute',
                bottom: -3,
                left: -3,
                width: 30,
                height: 30,
                borderBottom: '5px solid #fff',
                borderLeft: '5px solid #fff',
                borderRadius: '0 0 0 10px',
              }}
            />
            <div
              style={{
                position: 'absolute',
                bottom: -3,
                right: -3,
                width: 30,
                height: 30,
                borderBottom: '5px solid #fff',
                borderRight: '5px solid #fff',
                borderRadius: '0 0 10px 0',
              }}
            />

            {/* Scanning line animation */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 10,
                right: 10,
                height: 2,
                backgroundColor: 'var(--tg-button-color, #007AFF)',
                animation: 'scan 2s linear infinite',
              }}
            />
          </div>

          {/* Instructions */}
          <div
            style={{
              position: 'absolute',
              bottom: 100,
              left: 0,
              right: 0,
              textAlign: 'center',
              color: '#fff',
              fontSize: 16,
            }}
          >
            Наведите камеру на QR-код автомата
          </div>
        </>
      )}

      {/* Error state */}
      {cameraError && (
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 32,
            color: '#fff',
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 16 }}>📷</div>
          <div style={{ fontSize: 18, marginBottom: 8, textAlign: 'center' }}>{cameraError}</div>
          <div style={{ fontSize: 14, opacity: 0.7, textAlign: 'center', marginBottom: 24 }}>
            Разрешите доступ к камере в настройках браузера
          </div>
          <button
            onClick={handleManualInput}
            style={{
              padding: '12px 24px',
              backgroundColor: 'var(--tg-button-color, #007AFF)',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontSize: 16,
              cursor: 'pointer',
            }}
          >
            Ввести вручную
          </button>
        </div>
      )}

      {/* Manual input button */}
      {hasCamera && (
        <div
          style={{
            position: 'absolute',
            bottom: 40,
            left: 0,
            right: 0,
            textAlign: 'center',
          }}
        >
          <button
            onClick={handleManualInput}
            style={{
              padding: '12px 24px',
              backgroundColor: 'rgba(255,255,255,0.2)',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: 8,
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            Ввести номер вручную
          </button>
        </div>
      )}

      {/* CSS animation */}
      <style jsx>{`
        @keyframes scan {
          0% {
            top: 0;
          }
          50% {
            top: calc(100% - 2px);
          }
          100% {
            top: 0;
          }
        }
      `}</style>
    </div>
  )
}
