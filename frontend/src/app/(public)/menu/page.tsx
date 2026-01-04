'use client'

/**
 * Public Menu Page - "Warm Brew" Design
 *
 * Client-facing menu page with coffee-inspired design
 * Updated with vhm24v2 UI patterns
 */

import { Suspense, useState, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { Coffee, AlertCircle, Star, Heart, Plus, Minus, ArrowRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { clientApi } from '@/lib/client-api'
import { MenuItem } from '@/types/client'
import { cn } from '@/lib/utils'

// Import client theme CSS
import '../client-theme.css'

// Cart item type
interface CartItem {
  item: MenuItem
  quantity: number
}

// Category pill component
function CategoryPill({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'category-pill transition-all',
        active && 'active'
      )}
    >
      {label}
    </button>
  )
}

// Product card component
function ProductCard({
  item,
  quantity,
  onAdd,
  onRemove,
  index,
}: {
  item: MenuItem
  quantity: number
  onAdd: () => void
  onRemove: () => void
  index: number
}) {
  const [isFavorite, setIsFavorite] = useState(false)

  return (
    <div
      className={cn(
        'product-card animate-fade-in-up',
        !item.is_available && 'opacity-60'
      )}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Image */}
      <div className="product-card-image">
        {item.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.image_url}
            alt={item.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-[hsl(var(--client-latte))] flex items-center justify-center">
            <Coffee className="h-12 w-12 text-[hsl(var(--client-caramel))]" />
          </div>
        )}

        {/* Unavailable overlay */}
        {!item.is_available && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <Badge variant="destructive" className="text-sm">
              Нет в наличии
            </Badge>
          </div>
        )}

        {/* Favorite button */}
        <button
          className={cn(
            'product-card-favorite',
            isFavorite && 'active'
          )}
          onClick={() => setIsFavorite(!isFavorite)}
        >
          <Heart className={cn('h-5 w-5', isFavorite && 'fill-current')} />
        </button>

        {/* New/Popular badge */}
        {item.is_new && (
          <div className="product-card-badge bg-[hsl(var(--client-mint))]">
            Новинка
          </div>
        )}
      </div>

      {/* Content */}
      <div className="product-card-content">
        <h3 className="product-card-name">{item.name}</h3>
        {item.description && (
          <p className="product-card-description">{item.description}</p>
        )}

        {/* Footer */}
        <div className="product-card-footer">
          <div>
            <div className="product-card-price">
              {item.price.toLocaleString()} {item.currency}
            </div>
            {item.points_earned && item.points_earned > 0 && (
              <div className="points-display text-sm mt-1">
                <Star className="h-3 w-3" />
                <span>+{item.points_earned} баллов</span>
              </div>
            )}
          </div>

          {/* Quantity controls or Add button */}
          {item.is_available && (
            <div className="flex items-center">
              {quantity > 0 ? (
                <div className="quantity-controls">
                  <button className="quantity-btn" onClick={onRemove}>
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="quantity-value">{quantity}</span>
                  <button className="quantity-btn" onClick={onAdd}>
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <button className="product-card-add" onClick={onAdd}>
                  <Plus className="h-5 w-5" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Cart footer
function CartFooter({
  itemCount,
  totalAmount,
  currency,
  onCheckout,
}: {
  itemCount: number
  totalAmount: number
  currency: string
  onCheckout: () => void
}) {
  if (itemCount === 0) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[hsl(var(--client-latte))] p-4 shadow-lg z-50 animate-fade-in-up">
      <div className="container mx-auto flex items-center justify-between">
        <div>
          <div className="text-sm text-[hsl(var(--client-text-secondary))]">
            {itemCount} {itemCount === 1 ? 'товар' : 'товаров'}
          </div>
          <div className="text-xl font-bold text-[hsl(var(--client-text))]">
            {totalAmount.toLocaleString()} {currency}
          </div>
        </div>
        <Button className="btn-espresso flex items-center gap-2" onClick={onCheckout}>
          Оплатить
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

function MenuContent() {
  const searchParams = useSearchParams()
  const machineId = searchParams.get('machine_id')

  const [cart, setCart] = useState<CartItem[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  const { data: menuItems = [], isLoading, error } = useQuery({
    queryKey: ['public-menu', machineId],
    queryFn: () => clientApi.getMenu(machineId!),
    enabled: !!machineId,
  })

  // Extract categories
  const categories = useMemo(() => {
    const cats = new Set<string>()
    menuItems.forEach((item) => {
      if (item.category) cats.add(item.category)
    })
    return ['all', ...Array.from(cats)]
  }, [menuItems])

  // Filter menu by category
  const filteredMenu = useMemo(() => {
    if (selectedCategory === 'all') return menuItems
    return menuItems.filter((item) => item.category === selectedCategory)
  }, [menuItems, selectedCategory])

  // Cart functions
  const addToCart = (item: MenuItem) => {
    if (!item.is_available) return
    setCart((prev) => {
      const existing = prev.find((c) => c.item.id === item.id)
      if (existing) {
        return prev.map((c) =>
          c.item.id === item.id ? { ...c, quantity: c.quantity + 1 } : c
        )
      }
      return [...prev, { item, quantity: 1 }]
    })
  }

  const removeFromCart = (itemId: string) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.item.id === itemId)
      if (existing && existing.quantity > 1) {
        return prev.map((c) =>
          c.item.id === itemId ? { ...c, quantity: c.quantity - 1 } : c
        )
      }
      return prev.filter((c) => c.item.id !== itemId)
    })
  }

  const getCartQuantity = (itemId: string) => {
    return cart.find((c) => c.item.id === itemId)?.quantity || 0
  }

  const getTotalAmount = () => {
    return cart.reduce((sum, c) => sum + c.item.price * c.quantity, 0)
  }

  const getTotalItems = () => {
    return cart.reduce((sum, c) => sum + c.quantity, 0)
  }

  const handleCheckout = () => {
    // TODO: Implement checkout flow
    alert(`Оформление заказа\n\nИтого: ${getTotalAmount().toLocaleString()} UZS\nТоваров: ${getTotalItems()}`)
  }

  if (!machineId) {
    return (
      <div className="client-theme min-h-screen">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <div className="w-20 h-20 rounded-full bg-[hsl(var(--client-latte))] mx-auto mb-6 flex items-center justify-center">
              <AlertCircle className="h-10 w-10 text-[hsl(var(--client-text-muted))]" />
            </div>
            <h1 className="text-2xl font-bold mb-2 text-[hsl(var(--client-text))]">
              Аппарат не указан
            </h1>
            <p className="text-[hsl(var(--client-text-secondary))] mb-6">
              Сканируйте QR-код на аппарате, чтобы увидеть меню
            </p>
            <Button className="btn-espresso" asChild>
              <a href="/locations">Найти автомат</a>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="client-theme min-h-screen pb-24">
      {/* Header */}
      <div className="bg-white border-b border-[hsl(var(--client-latte))] sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[hsl(var(--client-latte))] flex items-center justify-center">
              <Coffee className="h-6 w-6 text-[hsl(var(--client-espresso))]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[hsl(var(--client-text))]">
                Меню
              </h1>
              <p className="text-sm text-[hsl(var(--client-text-secondary))]">
                Выберите напитки и закуски
              </p>
            </div>
          </div>
        </div>

        {/* Categories */}
        {categories.length > 1 && (
          <div className="border-t border-[hsl(var(--client-latte))]">
            <div className="container mx-auto px-4 py-3">
              <div className="flex gap-2 overflow-x-auto hide-scrollbar">
                {categories.map((cat) => (
                  <CategoryPill
                    key={cat}
                    label={cat === 'all' ? 'Все' : cat}
                    active={selectedCategory === cat}
                    onClick={() => setSelectedCategory(cat)}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-6">
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="animate-pulse overflow-hidden">
                <div className="h-48 bg-[hsl(var(--client-latte))]" />
                <CardContent className="p-4">
                  <div className="h-6 bg-[hsl(var(--client-latte))] rounded w-3/4 mb-2" />
                  <div className="h-4 bg-[hsl(var(--client-latte))] rounded w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <div className="w-20 h-20 rounded-full bg-red-50 mx-auto mb-6 flex items-center justify-center">
              <AlertCircle className="h-10 w-10 text-red-500" />
            </div>
            <p className="text-lg font-medium text-[hsl(var(--client-text))]">
              Ошибка загрузки меню
            </p>
            <p className="text-[hsl(var(--client-text-secondary))]">
              Попробуйте обновить страницу
            </p>
          </div>
        ) : filteredMenu.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-20 h-20 rounded-full bg-[hsl(var(--client-latte))] mx-auto mb-6 flex items-center justify-center">
              <Coffee className="h-10 w-10 text-[hsl(var(--client-caramel))]" />
            </div>
            <p className="text-lg font-medium text-[hsl(var(--client-text))]">
              Меню пусто
            </p>
            <p className="text-[hsl(var(--client-text-secondary))]">
              В данный момент нет доступных продуктов
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 stagger-children">
            {filteredMenu.map((item, index) => (
              <ProductCard
                key={item.id}
                item={item}
                quantity={getCartQuantity(item.id)}
                onAdd={() => addToCart(item)}
                onRemove={() => removeFromCart(item.id)}
                index={index}
              />
            ))}
          </div>
        )}
      </div>

      {/* Telegram Bot CTA */}
      <div className="container mx-auto px-4 py-8">
        <div className="promo-banner">
          <div className="relative z-10">
            <h2 className="promo-banner-title">
              Хотите заказать? Используйте Telegram бот!
            </h2>
            <p className="promo-banner-text mb-4">
              Сканируйте QR-код на аппарате или откройте нашего бота
            </p>
            <Button
              className="bg-white text-[hsl(var(--client-mint))] hover:bg-white/90"
              asChild
            >
              <a href="https://t.me/VendHubBot" target="_blank" rel="noopener noreferrer">
                Открыть @VendHubBot
              </a>
            </Button>
          </div>
        </div>
      </div>

      {/* Cart footer */}
      <CartFooter
        itemCount={getTotalItems()}
        totalAmount={getTotalAmount()}
        currency="UZS"
        onCheckout={handleCheckout}
      />
    </div>
  )
}

function MenuLoading() {
  return (
    <div className="client-theme min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="h-10 bg-[hsl(var(--client-latte))] rounded w-48 mb-2 animate-pulse" />
          <div className="h-5 bg-[hsl(var(--client-latte))] rounded w-64 animate-pulse" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse overflow-hidden">
              <div className="h-48 bg-[hsl(var(--client-latte))]" />
              <CardContent className="p-4">
                <div className="h-6 bg-[hsl(var(--client-latte))] rounded w-3/4 mb-2" />
                <div className="h-4 bg-[hsl(var(--client-latte))] rounded w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function MenuPage() {
  return (
    <Suspense fallback={<MenuLoading />}>
      <MenuContent />
    </Suspense>
  )
}
