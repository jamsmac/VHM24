'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTelegram } from '../components/TelegramProvider'

interface Product {
  id: string
  name: string
  price: number
  image_url?: string
  category?: string
  description?: string
  available: boolean
}

interface CartItem {
  product: Product
  quantity: number
}

function MenuContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const machineNumber = searchParams.get('machine')
  const { isReady, showMainButton, hideMainButton, showBackButton, hideBackButton, hapticFeedback } = useTelegram()

  const [isLoading, setIsLoading] = useState(true)
  const [products, setProducts] = useState<Product[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [machineName, setMachineName] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Calculate cart total
  const cartTotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0)
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0)

  // Load products
  useEffect(() => {
    if (!machineNumber) {
      router.replace('/tg')
      return
    }

    const loadProducts = async () => {
      setIsLoading(true)
      try {
        // TODO: Replace with actual API call
        // const response = await apiClient.get(`/client/machines/${machineNumber}/products`)
        // setProducts(response.data)

        // Mock data for now
        setMachineName(`Автомат #${machineNumber}`)
        setProducts([
          { id: '1', name: 'Кофе Американо', price: 15000, available: true, category: 'Напитки' },
          { id: '2', name: 'Кофе Капучино', price: 18000, available: true, category: 'Напитки' },
          { id: '3', name: 'Кофе Латте', price: 20000, available: true, category: 'Напитки' },
          { id: '4', name: 'Чай черный', price: 10000, available: true, category: 'Напитки' },
          { id: '5', name: 'Чай зеленый', price: 10000, available: true, category: 'Напитки' },
          { id: '6', name: 'Горячий шоколад', price: 16000, available: true, category: 'Напитки' },
          { id: '7', name: 'Сникерс', price: 12000, available: true, category: 'Снеки' },
          { id: '8', name: 'Твикс', price: 12000, available: true, category: 'Снеки' },
          { id: '9', name: 'Чипсы Lay\'s', price: 15000, available: false, category: 'Снеки' },
        ])
      } catch {
        setError('Не удалось загрузить меню')
      } finally {
        setIsLoading(false)
      }
    }

    loadProducts()

    // Load cart from localStorage
    const storedCart = localStorage.getItem(`cart_${machineNumber}`)
    if (storedCart) {
      try {
        setCart(JSON.parse(storedCart))
      } catch {
        // ignore
      }
    }
  }, [machineNumber, router])

  // Save cart to localStorage
  useEffect(() => {
    if (machineNumber && cart.length > 0) {
      localStorage.setItem(`cart_${machineNumber}`, JSON.stringify(cart))
    }
  }, [cart, machineNumber])

  // Back button
  useEffect(() => {
    if (isReady) {
      showBackButton(() => router.push('/tg'))
      return () => hideBackButton()
    }
  }, [isReady, router, showBackButton, hideBackButton])

  // Main button for cart
  useEffect(() => {
    if (isReady && cartCount > 0) {
      showMainButton(`Корзина (${cartCount}) — ${formatPrice(cartTotal)}`, () => {
        router.push(`/tg/cart?machine=${machineNumber}`)
      })
      return () => hideMainButton()
    } else if (isReady) {
      hideMainButton()
    }
  }, [isReady, cartCount, cartTotal, machineNumber, router, showMainButton, hideMainButton])

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ru-RU').format(price) + ' сум'
  }

  const addToCart = useCallback((product: Product) => {
    hapticFeedback?.impactOccurred('light')
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id)
      if (existing) {
        return prev.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      }
      return [...prev, { product, quantity: 1 }]
    })
  }, [hapticFeedback])

  const removeFromCart = useCallback((productId: string) => {
    hapticFeedback?.impactOccurred('light')
    setCart(prev => {
      const existing = prev.find(item => item.product.id === productId)
      if (existing && existing.quantity > 1) {
        return prev.map(item =>
          item.product.id === productId
            ? { ...item, quantity: item.quantity - 1 }
            : item
        )
      }
      return prev.filter(item => item.product.id !== productId)
    })
  }, [hapticFeedback])

  const getCartQuantity = useCallback((productId: string) => {
    return cart.find(item => item.product.id === productId)?.quantity || 0
  }, [cart])

  if (isLoading) {
    return (
      <div className="tg-app">
        <div className="tg-header">
          <div className="tg-skeleton" style={{ width: 150, height: 20, margin: '0 auto' }} />
        </div>
        <div className="tg-section">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="tg-card" style={{ display: 'flex', gap: 12 }}>
              <div className="tg-skeleton" style={{ width: 80, height: 80, borderRadius: 12 }} />
              <div style={{ flex: 1 }}>
                <div className="tg-skeleton" style={{ width: '70%', height: 18, marginBottom: 8 }} />
                <div className="tg-skeleton" style={{ width: '40%', height: 16 }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="tg-app">
        <div className="tg-empty-state">
          <div className="tg-empty-state-icon">😔</div>
          <div className="tg-empty-state-title">{error}</div>
          <button className="tg-button tg-button-primary" onClick={() => router.push('/tg')} style={{ marginTop: 16 }}>
            На главную
          </button>
        </div>
      </div>
    )
  }

  // Group products by category
  const categories = [...new Set(products.map(p => p.category || 'Другое'))]

  return (
    <div className="tg-app" style={{ paddingBottom: cartCount > 0 ? 80 : 0 }}>
      {/* Header */}
      <div className="tg-header">
        <div className="tg-header-title">{machineName}</div>
      </div>

      {/* Products by category */}
      {categories.map(category => (
        <div key={category} className="tg-section">
          <div className="tg-section-title">{category}</div>
          {products
            .filter(p => (p.category || 'Другое') === category)
            .map(product => {
              const quantity = getCartQuantity(product.id)
              return (
                <div
                  key={product.id}
                  className="tg-card"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    opacity: product.available ? 1 : 0.5,
                  }}
                >
                  {/* Product image placeholder */}
                  <div
                    style={{
                      width: 60,
                      height: 60,
                      borderRadius: 12,
                      backgroundColor: 'var(--tg-bg-color)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 24,
                    }}
                  >
                    {product.category === 'Напитки' ? '☕' : '🍫'}
                  </div>

                  {/* Product info */}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500, marginBottom: 4 }}>{product.name}</div>
                    <div style={{ color: 'var(--tg-button-color)', fontWeight: 600 }}>
                      {formatPrice(product.price)}
                    </div>
                    {!product.available && (
                      <div className="tg-hint" style={{ fontSize: 12 }}>Нет в наличии</div>
                    )}
                  </div>

                  {/* Add to cart */}
                  {product.available && (
                    <div>
                      {quantity > 0 ? (
                        <div className="tg-counter">
                          <button
                            className="tg-counter-button"
                            onClick={() => removeFromCart(product.id)}
                          >
                            −
                          </button>
                          <span className="tg-counter-value">{quantity}</span>
                          <button
                            className="tg-counter-button"
                            onClick={() => addToCart(product)}
                          >
                            +
                          </button>
                        </div>
                      ) : (
                        <button
                          className="tg-button tg-button-primary"
                          onClick={() => addToCart(product)}
                          style={{ padding: '8px 16px', fontSize: 14 }}
                        >
                          +
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
        </div>
      ))}
    </div>
  )
}

export default function MenuPage() {
  return (
    <Suspense fallback={
      <div className="tg-app" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div className="tg-skeleton" style={{ width: 48, height: 48, borderRadius: '50%' }} />
      </div>
    }>
      <MenuContent />
    </Suspense>
  )
}
