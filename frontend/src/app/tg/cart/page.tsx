'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTelegram } from '../components/TelegramProvider'
import { apiClient } from '@/lib/axios'

interface Product {
  id: string
  name: string
  price: number
  image_url?: string
  category?: string
}

interface CartItem {
  product: Product
  quantity: number
}

interface PromoValidation {
  valid: boolean
  error?: string
  discount_amount?: number
  bonus_points?: number
  description?: string
}

function CartContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const machineNumber = searchParams.get('machine')
  const { webApp, isReady, showMainButton, hideMainButton, showBackButton, hideBackButton, hapticFeedback } = useTelegram()

  const [cart, setCart] = useState<CartItem[]>([])
  const [promoCode, setPromoCode] = useState('')
  const [promoValidation, setPromoValidation] = useState<PromoValidation | null>(null)
  const [isValidatingPromo, setIsValidatingPromo] = useState(false)
  const [usePoints, setUsePoints] = useState(false)
  const [pointsBalance, setPointsBalance] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)

  // Calculate totals
  const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0)
  const promoDiscount = promoValidation?.valid ? (promoValidation.discount_amount || 0) : 0
  const pointsDiscount = usePoints ? Math.min(pointsBalance * 100, subtotal * 0.5) : 0
  const total = Math.max(0, subtotal - promoDiscount - pointsDiscount)

  // Load cart from localStorage
  useEffect(() => {
    if (!machineNumber) {
      router.replace('/tg')
      return
    }

    const storedCart = localStorage.getItem(`cart_${machineNumber}`)
    if (storedCart) {
      try {
        setCart(JSON.parse(storedCart))
      } catch {
        router.replace('/tg')
      }
    } else {
      router.replace(`/tg/menu?machine=${machineNumber}`)
    }

    // Load points balance (mock for now)
    setPointsBalance(150)
  }, [machineNumber, router])

  // Save cart to localStorage
  useEffect(() => {
    if (machineNumber && cart.length > 0) {
      localStorage.setItem(`cart_${machineNumber}`, JSON.stringify(cart))
    } else if (machineNumber && cart.length === 0) {
      localStorage.removeItem(`cart_${machineNumber}`)
    }
  }, [cart, machineNumber])

  // Back button
  useEffect(() => {
    if (isReady) {
      showBackButton(() => router.push(`/tg/menu?machine=${machineNumber}`))
      return () => hideBackButton()
    }
  }, [isReady, machineNumber, router, showBackButton, hideBackButton])

  // Main button for checkout
  useEffect(() => {
    if (isReady && cart.length > 0 && !isProcessing) {
      showMainButton(`Оплатить ${formatPrice(total)}`, handleCheckout)
      return () => hideMainButton()
    } else if (isReady) {
      hideMainButton()
    }
  }, [isReady, cart.length, total, isProcessing])

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ru-RU').format(price) + ' сум'
  }

  const updateQuantity = useCallback((productId: string, delta: number) => {
    hapticFeedback?.impactOccurred('light')
    setCart(prev => {
      return prev.map(item => {
        if (item.product.id === productId) {
          const newQuantity = item.quantity + delta
          if (newQuantity <= 0) {
            return null
          }
          return { ...item, quantity: newQuantity }
        }
        return item
      }).filter(Boolean) as CartItem[]
    })
  }, [hapticFeedback])

  const _removeItem = useCallback((productId: string) => {
    hapticFeedback?.notificationOccurred('warning')
    setCart(prev => prev.filter(item => item.product.id !== productId))
  }, [hapticFeedback])

  const validatePromoCode = useCallback(async () => {
    if (!promoCode.trim()) return

    setIsValidatingPromo(true)
    try {
      const response = await apiClient.post('/client/promo-codes/validate', {
        code: promoCode.toUpperCase(),
        order_amount: subtotal,
        machine_id: machineNumber,
      })
      setPromoValidation(response.data)
      if (response.data.valid) {
        hapticFeedback?.notificationOccurred('success')
      } else {
        hapticFeedback?.notificationOccurred('error')
      }
    } catch {
      setPromoValidation({ valid: false, error: 'Не удалось проверить промокод' })
      hapticFeedback?.notificationOccurred('error')
    } finally {
      setIsValidatingPromo(false)
    }
  }, [promoCode, subtotal, machineNumber, hapticFeedback])

  const handleCheckout = useCallback(async () => {
    if (isProcessing || cart.length === 0) return

    setIsProcessing(true)
    hapticFeedback?.impactOccurred('heavy')

    try {
      // Create order via API
      const orderData = {
        machine_id: machineNumber,
        items: cart.map(item => ({
          product_id: item.product.id,
          quantity: item.quantity,
          unit_price: item.product.price,
        })),
        promo_code: promoValidation?.valid ? promoCode : undefined,
        redeem_points: usePoints ? Math.floor(pointsDiscount / 100) : 0,
        payment_provider: 'telegram',
      }

      const orderResponse = await apiClient.post('/client/orders', orderData)
      const orderId = orderResponse.data.id

      // Get invoice link for Telegram Payments
      const invoiceResponse = await apiClient.post(`/client/orders/${orderId}/invoice`)
      const { invoice_link } = invoiceResponse.data

      // Open Telegram Payments
      if (webApp && typeof webApp.openInvoice === 'function') {
        webApp.openInvoice(invoice_link, (status) => {
          if (status === 'paid') {
            // Clear cart and redirect
            localStorage.removeItem(`cart_${machineNumber}`)
            hapticFeedback?.notificationOccurred('success')
            webApp.showAlert('Заказ успешно оплачен!', () => {
              router.push('/tg/profile/history')
            })
          } else if (status === 'cancelled') {
            setIsProcessing(false)
            hapticFeedback?.notificationOccurred('warning')
          } else if (status === 'failed') {
            setIsProcessing(false)
            hapticFeedback?.notificationOccurred('error')
            webApp.showAlert('Ошибка при оплате. Попробуйте снова.')
          } else {
            // pending or unknown
            setIsProcessing(false)
          }
        })
      } else {
        // Development mode - simulate with popup
        if (webApp) {
          webApp.showPopup({
            title: 'Оплата',
            message: `Сумма к оплате: ${formatPrice(total)}`,
            buttons: [
              { id: 'pay', type: 'default', text: 'Оплатить' },
              { id: 'cancel', type: 'cancel', text: 'Отмена' },
            ],
          }, (buttonId) => {
            if (buttonId === 'pay') {
              localStorage.removeItem(`cart_${machineNumber}`)
              hapticFeedback?.notificationOccurred('success')
              webApp.showAlert('Заказ успешно оплачен!', () => {
                router.push('/tg/profile/history')
              })
            } else {
              setIsProcessing(false)
            }
          })
        } else {
          // Pure development mode
          if (confirm(`Оплатить ${formatPrice(total)}?`)) {
            localStorage.removeItem(`cart_${machineNumber}`)
            router.push('/tg/profile/history')
          } else {
            setIsProcessing(false)
          }
        }
      }
    } catch (error) {
      console.error('Checkout error:', error)
      hapticFeedback?.notificationOccurred('error')
      setIsProcessing(false)
      if (webApp) {
        webApp.showAlert('Ошибка при создании заказа')
      } else {
        alert('Ошибка при создании заказа')
      }
    }
  }, [isProcessing, cart, machineNumber, promoCode, promoValidation, usePoints, pointsDiscount, total, webApp, hapticFeedback, router])

  if (cart.length === 0) {
    return (
      <div className="tg-app">
        <div className="tg-empty-state">
          <div className="tg-empty-state-icon">🛒</div>
          <div className="tg-empty-state-title">Корзина пуста</div>
          <div className="tg-empty-state-text">Добавьте товары из меню</div>
          <button
            className="tg-button tg-button-primary"
            onClick={() => router.push(`/tg/menu?machine=${machineNumber}`)}
            style={{ marginTop: 16 }}
          >
            Перейти в меню
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="tg-app tg-bottom-safe" style={{ paddingBottom: 80 }}>
      {/* Header */}
      <div className="tg-header">
        <div className="tg-header-title">Корзина</div>
      </div>

      {/* Cart items */}
      <div className="tg-section">
        {cart.map(item => (
          <div key={item.product.id} className="tg-card" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Product icon */}
            <div
              style={{
                width: 50,
                height: 50,
                borderRadius: 10,
                backgroundColor: 'var(--tg-bg-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20,
              }}
            >
              {item.product.category === 'Напитки' ? '☕' : '🍫'}
            </div>

            {/* Product info */}
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 500, marginBottom: 2 }}>{item.product.name}</div>
              <div style={{ color: 'var(--tg-button-color)', fontWeight: 600, fontSize: 14 }}>
                {formatPrice(item.product.price * item.quantity)}
              </div>
            </div>

            {/* Quantity control */}
            <div className="tg-counter">
              <button className="tg-counter-button" onClick={() => updateQuantity(item.product.id, -1)}>
                −
              </button>
              <span className="tg-counter-value">{item.quantity}</span>
              <button className="tg-counter-button" onClick={() => updateQuantity(item.product.id, 1)}>
                +
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Promo code */}
      <div className="tg-section">
        <div className="tg-section-title">Промокод</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
            className="tg-input"
            placeholder="Введите промокод"
            value={promoCode}
            onChange={(e) => {
              setPromoCode(e.target.value.toUpperCase())
              setPromoValidation(null)
            }}
            style={{ flex: 1, textTransform: 'uppercase' }}
          />
          <button
            className="tg-button tg-button-secondary"
            onClick={validatePromoCode}
            disabled={isValidatingPromo || !promoCode.trim()}
            style={{ width: 100 }}
          >
            {isValidatingPromo ? '...' : 'Применить'}
          </button>
        </div>
        {promoValidation && (
          <div
            style={{
              marginTop: 8,
              padding: 12,
              borderRadius: 8,
              backgroundColor: promoValidation.valid ? 'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)',
              color: promoValidation.valid ? '#4CAF50' : '#f44336',
              fontSize: 14,
            }}
          >
            {promoValidation.valid
              ? `Скидка: ${formatPrice(promoValidation.discount_amount || 0)}`
              : promoValidation.error}
          </div>
        )}
      </div>

      {/* Use points */}
      {pointsBalance > 0 && (
        <div className="tg-section">
          <div
            className="tg-card"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <div>
              <div style={{ fontWeight: 500 }}>Использовать бонусы</div>
              <div className="tg-hint" style={{ fontSize: 13 }}>
                Доступно: {pointsBalance} баллов
              </div>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="checkbox"
                checked={usePoints}
                onChange={(e) => setUsePoints(e.target.checked)}
                style={{ width: 20, height: 20 }}
              />
            </label>
          </div>
          {usePoints && (
            <div className="tg-hint" style={{ marginTop: 8, paddingLeft: 4 }}>
              Скидка: {formatPrice(pointsDiscount)}
            </div>
          )}
        </div>
      )}

      {/* Summary */}
      <div className="tg-section">
        <div className="tg-section-title">Итого</div>
        <div className="tg-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span className="tg-hint">Товары</span>
            <span>{formatPrice(subtotal)}</span>
          </div>
          {promoDiscount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, color: '#4CAF50' }}>
              <span>Промокод</span>
              <span>−{formatPrice(promoDiscount)}</span>
            </div>
          )}
          {pointsDiscount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, color: '#9C27B0' }}>
              <span>Бонусы</span>
              <span>−{formatPrice(pointsDiscount)}</span>
            </div>
          )}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              paddingTop: 8,
              borderTop: '1px solid var(--tg-secondary-bg-color)',
              fontWeight: 600,
              fontSize: 18,
            }}
          >
            <span>К оплате</span>
            <span style={{ color: 'var(--tg-button-color)' }}>{formatPrice(total)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function CartPage() {
  return (
    <Suspense fallback={
      <div className="tg-app" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div className="tg-skeleton" style={{ width: 48, height: 48, borderRadius: '50%' }} />
      </div>
    }>
      <CartContent />
    </Suspense>
  )
}
