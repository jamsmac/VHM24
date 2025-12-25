'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { Coffee, AlertCircle, Star } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { clientApi } from '@/lib/client-api'
import { MenuItem } from '@/types/client'

function MenuContent() {
  const searchParams = useSearchParams()
  const machineId = searchParams.get('machine_id')

  const { data: menuItems = [], isLoading, error } = useQuery({
    queryKey: ['public-menu', machineId],
    queryFn: () => clientApi.getMenu(machineId!),
    enabled: !!machineId,
  })

  if (!machineId) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">Аппарат не указан</h1>
          <p className="text-muted-foreground mb-4">
            Сканируйте QR-код на аппарате, чтобы увидеть меню
          </p>
          <Button asChild>
            <a href="/locations">Найти автомат</a>
          </Button>
        </div>
      </div>
    )
  }

  // Group items by category
  const categories = menuItems.reduce(
    (acc: Record<string, MenuItem[]>, item) => {
      const category = item.category || 'Другое'
      if (!acc[category]) acc[category] = []
      acc[category].push(item)
      return acc
    },
    {}
  )

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Меню автомата</h1>
        <p className="text-muted-foreground">
          Выберите продукт и оплатите через Telegram бот
        </p>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <div className="h-48 bg-muted"></div>
              <CardContent className="p-4">
                <div className="h-6 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-muted rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
          <p className="text-lg font-medium">Ошибка загрузки меню</p>
          <p className="text-muted-foreground">Попробуйте обновить страницу</p>
        </div>
      ) : menuItems.length === 0 ? (
        <div className="text-center py-12">
          <Coffee className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-lg font-medium">Меню пусто</p>
          <p className="text-muted-foreground">
            В данный момент нет доступных продуктов
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(categories).map(([category, items]) => (
            <div key={category}>
              <h2 className="text-xl font-semibold mb-4">{category}</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {items.map((item) => (
                  <Card
                    key={item.id}
                    className={`overflow-hidden ${!item.is_available ? 'opacity-50' : ''}`}
                  >
                    {item.image_url ? (
                      <div className="h-48 bg-muted relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                        {!item.is_available && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <Badge variant="destructive">Нет в наличии</Badge>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="h-48 bg-muted flex items-center justify-center">
                        <Coffee className="h-12 w-12 text-muted-foreground" />
                      </div>
                    )}
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-semibold">{item.name}</h3>
                          {item.description && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {item.description}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-lg">
                            {item.price.toLocaleString()} {item.currency}
                          </div>
                          {item.points_earned && item.points_earned > 0 && (
                            <div className="flex items-center gap-1 text-sm text-primary">
                              <Star className="h-3 w-3" />
                              +{item.points_earned} баллов
                            </div>
                          )}
                        </div>
                      </div>
                      {item.stock !== undefined && item.is_available && (
                        <div className="mt-2 text-sm text-muted-foreground">
                          В наличии: {item.stock} шт.
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Telegram Bot CTA */}
      <div className="mt-12 bg-primary/5 rounded-lg p-6 text-center">
        <h2 className="text-xl font-semibold mb-2">
          Хотите заказать? Используйте Telegram бот!
        </h2>
        <p className="text-muted-foreground mb-4">
          Сканируйте QR-код на аппарате или откройте нашего бота
        </p>
        <Button asChild>
          <a href="https://t.me/VendHubBot" target="_blank" rel="noopener noreferrer">
            Открыть @VendHubBot
          </a>
        </Button>
      </div>
    </div>
  )
}

function MenuLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="h-10 bg-muted rounded w-48 mb-2 animate-pulse"></div>
        <div className="h-5 bg-muted rounded w-64 animate-pulse"></div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <div className="h-48 bg-muted"></div>
            <CardContent className="p-4">
              <div className="h-6 bg-muted rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-muted rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
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
