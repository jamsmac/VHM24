'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTelegram } from '../../components/TelegramProvider'
import { apiClient } from '@/lib/axios'

interface OrderItem {
  id: string
  product_name: string
  quantity: number
  unit_price: number
}

interface Order {
  id: string
  order_number: string
  status: 'pending' | 'paid' | 'processing' | 'ready' | 'dispensed' | 'completed' | 'cancelled' | 'failed'
  total_amount: number
  discount_amount: number
  final_amount: number
  items: OrderItem[]
  machine?: {
    id: string
    name: string
    location?: string
  }
  created_at: string
  completed_at?: string
}

const STATUS_CONFIG: Record<Order['status'], { label: string; color: string; icon: string }> = {
  pending: { label: 'Ожидает оплаты', color: '#FFC107', icon: '⏳' },
  paid: { label: 'Оплачен', color: '#2196F3', icon: '💳' },
  processing: { label: 'Готовится', color: '#FF9800', icon: '⚙️' },
  ready: { label: 'Готов к выдаче', color: '#9C27B0', icon: '📦' },
  dispensed: { label: 'Выдан', color: '#4CAF50', icon: '✅' },
  completed: { label: 'Завершён', color: '#4CAF50', icon: '✅' },
  cancelled: { label: 'Отменён', color: '#9E9E9E', icon: '❌' },
  failed: { label: 'Ошибка', color: '#f44336', icon: '⚠️' },
}

export default function OrderHistoryPage() {
  const router = useRouter()
  const { isReady, isAuthenticated, authenticate, showBackButton, hideBackButton, hapticFeedback } = useTelegram()

  const [orders, setOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)

  // Back button
  useEffect(() => {
    if (isReady) {
      if (selectedOrder) {
        showBackButton(() => setSelectedOrder(null))
      } else {
        showBackButton(() => router.push('/tg/profile'))
      }
      return () => hideBackButton()
    }
  }, [isReady, router, selectedOrder, showBackButton, hideBackButton])

  // Load orders
  useEffect(() => {
    const loadOrders = async () => {
      if (!isAuthenticated) {
        const success = await authenticate()
        if (!success) {
          setIsLoading(false)
          return
        }
      }

      try {
        const response = await apiClient.get('/client/orders')
        setOrders(response.data.items || response.data || [])
      } catch (error) {
        console.error('Failed to load orders:', error)
        // Mock data for development
        setOrders([
          {
            id: '1',
            order_number: 'VH-001234',
            status: 'completed',
            total_amount: 25000,
            discount_amount: 2500,
            final_amount: 22500,
            items: [
              { id: '1', product_name: 'Американо', quantity: 2, unit_price: 10000 },
              { id: '2', product_name: 'Сникерс', quantity: 1, unit_price: 5000 },
            ],
            machine: { id: '1', name: 'VM-001', location: 'БЦ Навои, 1 этаж' },
            created_at: new Date(Date.now() - 3600000).toISOString(),
            completed_at: new Date(Date.now() - 3500000).toISOString(),
          },
          {
            id: '2',
            order_number: 'VH-001233',
            status: 'dispensed',
            total_amount: 15000,
            discount_amount: 0,
            final_amount: 15000,
            items: [
              { id: '3', product_name: 'Капучино', quantity: 1, unit_price: 15000 },
            ],
            machine: { id: '2', name: 'VM-002', location: 'Тц Mega Planet' },
            created_at: new Date(Date.now() - 86400000).toISOString(),
          },
          {
            id: '3',
            order_number: 'VH-001230',
            status: 'cancelled',
            total_amount: 8000,
            discount_amount: 0,
            final_amount: 8000,
            items: [
              { id: '4', product_name: 'Вода 0.5л', quantity: 2, unit_price: 4000 },
            ],
            machine: { id: '1', name: 'VM-001', location: 'БЦ Навои, 1 этаж' },
            created_at: new Date(Date.now() - 172800000).toISOString(),
          },
        ])
      } finally {
        setIsLoading(false)
      }
    }

    if (isReady) {
      loadOrders()
    }
  }, [isReady, isAuthenticated, authenticate])

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ru-RU').format(price) + ' сум'
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays === 0) {
      return 'Сегодня, ' + date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
    } else if (diffDays === 1) {
      return 'Вчера, ' + date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
    }
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const handleOrderClick = (order: Order) => {
    hapticFeedback?.impactOccurred('light')
    setSelectedOrder(order)
  }

  const handleReorder = async (order: Order) => {
    hapticFeedback?.impactOccurred('medium')
    // Build cart from order items
    const cart = order.items.map(item => ({
      product: {
        id: item.id,
        name: item.product_name,
        price: item.unit_price,
      },
      quantity: item.quantity,
    }))
    localStorage.setItem(`cart_${order.machine?.id}`, JSON.stringify(cart))
    router.push(`/tg/cart?machine=${order.machine?.id}`)
  }

  if (isLoading) {
    return (
      <div className="tg-app" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div className="tg-skeleton" style={{ width: 48, height: 48, borderRadius: '50%' }} />
      </div>
    )
  }

  // Order detail view
  if (selectedOrder) {
    const statusConfig = STATUS_CONFIG[selectedOrder.status]

    return (
      <div className="tg-app tg-bottom-safe">
        {/* Header */}
        <div className="tg-header">
          <div className="tg-header-title">Заказ {selectedOrder.order_number}</div>
        </div>

        {/* Status */}
        <div className="tg-section">
          <div className="tg-card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>{statusConfig.icon}</div>
            <div
              style={{
                display: 'inline-block',
                padding: '6px 16px',
                borderRadius: 16,
                backgroundColor: statusConfig.color,
                color: '#fff',
                fontWeight: 500,
                fontSize: 14,
              }}
            >
              {statusConfig.label}
            </div>
            <div className="tg-hint" style={{ marginTop: 12 }}>
              {formatDate(selectedOrder.created_at)}
            </div>
          </div>
        </div>

        {/* Machine info */}
        {selectedOrder.machine && (
          <div className="tg-section">
            <div className="tg-section-title">Автомат</div>
            <div className="tg-card">
              <div style={{ fontWeight: 500 }}>{selectedOrder.machine.name}</div>
              {selectedOrder.machine.location && (
                <div className="tg-hint" style={{ marginTop: 4 }}>
                  📍 {selectedOrder.machine.location}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Items */}
        <div className="tg-section">
          <div className="tg-section-title">Состав заказа</div>
          <div className="tg-card">
            {selectedOrder.items.map((item, index) => (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 0',
                  borderBottom: index < selectedOrder.items.length - 1 ? '1px solid var(--tg-secondary-bg-color)' : 'none',
                }}
              >
                <div>
                  <div>{item.product_name}</div>
                  <div className="tg-hint" style={{ fontSize: 13 }}>
                    {item.quantity} × {formatPrice(item.unit_price)}
                  </div>
                </div>
                <div style={{ fontWeight: 500 }}>
                  {formatPrice(item.quantity * item.unit_price)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Summary */}
        <div className="tg-section">
          <div className="tg-section-title">Итого</div>
          <div className="tg-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span className="tg-hint">Товары</span>
              <span>{formatPrice(selectedOrder.total_amount)}</span>
            </div>
            {selectedOrder.discount_amount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, color: '#4CAF50' }}>
                <span>Скидка</span>
                <span>−{formatPrice(selectedOrder.discount_amount)}</span>
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
              <span>Оплачено</span>
              <span style={{ color: 'var(--tg-button-color)' }}>
                {formatPrice(selectedOrder.final_amount)}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        {['completed', 'dispensed'].includes(selectedOrder.status) && selectedOrder.machine && (
          <div className="tg-section">
            <button
              className="tg-button tg-button-primary"
              onClick={() => handleReorder(selectedOrder)}
              style={{ width: '100%' }}
            >
              Повторить заказ
            </button>
          </div>
        )}
      </div>
    )
  }

  // Orders list
  return (
    <div className="tg-app tg-bottom-safe">
      {/* Header */}
      <div className="tg-header">
        <div className="tg-header-title">История заказов</div>
      </div>

      {orders.length === 0 ? (
        <div className="tg-empty-state">
          <div className="tg-empty-state-icon">📋</div>
          <div className="tg-empty-state-title">Нет заказов</div>
          <div className="tg-empty-state-text">Ваши заказы появятся здесь</div>
          <button
            className="tg-button tg-button-primary"
            onClick={() => router.push('/tg')}
            style={{ marginTop: 16 }}
          >
            Сделать заказ
          </button>
        </div>
      ) : (
        <div className="tg-section">
          {orders.map(order => {
            const statusConfig = STATUS_CONFIG[order.status]
            return (
              <div
                key={order.id}
                className="tg-card"
                onClick={() => handleOrderClick(order)}
                style={{ cursor: 'pointer', marginBottom: 12 }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{order.order_number}</div>
                    <div className="tg-hint" style={{ fontSize: 13 }}>{formatDate(order.created_at)}</div>
                  </div>
                  <div
                    style={{
                      padding: '4px 10px',
                      borderRadius: 12,
                      backgroundColor: statusConfig.color,
                      color: '#fff',
                      fontSize: 12,
                      fontWeight: 500,
                    }}
                  >
                    {statusConfig.icon} {statusConfig.label}
                  </div>
                </div>

                <div style={{ marginBottom: 8 }}>
                  {order.items.slice(0, 2).map(item => (
                    <div key={item.id} className="tg-hint" style={{ fontSize: 13 }}>
                      {item.product_name} × {item.quantity}
                    </div>
                  ))}
                  {order.items.length > 2 && (
                    <div className="tg-hint" style={{ fontSize: 13 }}>
                      и ещё {order.items.length - 2} товар(ов)...
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  {order.machine && (
                    <div className="tg-hint" style={{ fontSize: 12 }}>
                      📍 {order.machine.name}
                    </div>
                  )}
                  <div style={{ fontWeight: 600, color: 'var(--tg-button-color)' }}>
                    {formatPrice(order.final_amount)}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Tab bar */}
      <div className="tg-tab-bar">
        <div className="tg-tab-item" onClick={() => router.push('/tg')}>
          <div className="tg-tab-icon">🏠</div>
          <div className="tg-tab-label">Главная</div>
        </div>
        <div className="tg-tab-item tg-tab-item-active">
          <div className="tg-tab-icon">📋</div>
          <div className="tg-tab-label">Заказы</div>
        </div>
        <div className="tg-tab-item" onClick={() => router.push('/tg/profile')}>
          <div className="tg-tab-icon">👤</div>
          <div className="tg-tab-label">Профиль</div>
        </div>
      </div>
    </div>
  )
}
