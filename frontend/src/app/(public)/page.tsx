'use client'

import Link from 'next/link'
import { Coffee, MapPin, Smartphone, Gift, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export default function LandingPage() {
  return (
    <div>
      {/* Hero Section */}
      <section className="relative bg-gradient-to-b from-primary/5 to-background py-20 md:py-32">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
              Свежий кофе и снеки{' '}
              <span className="text-primary">рядом с вами</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              Сеть современных вендинговых автоматов VendHub. Найдите ближайший
              автомат, сканируйте QR-код и получайте бонусы за каждую покупку.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild>
                <Link href="/locations">
                  <MapPin className="mr-2 h-5 w-5" />
                  Найти автомат
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/cooperation">
                  Стать партнёром
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">
            Как это работает
          </h2>
          <div className="grid gap-8 md:grid-cols-3">
            <Card className="text-center">
              <CardContent className="pt-6">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <MapPin className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Найдите автомат</h3>
                <p className="text-muted-foreground">
                  Используйте карту для поиска ближайшего автомата VendHub в вашем
                  городе
                </p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardContent className="pt-6">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <Smartphone className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Сканируйте QR-код</h3>
                <p className="text-muted-foreground">
                  Сканируйте QR-код на автомате через Telegram бот для просмотра
                  меню и оплаты
                </p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardContent className="pt-6">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <Gift className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Получайте бонусы</h3>
                <p className="text-muted-foreground">
                  Копите баллы за каждую покупку и обменивайте их на скидки и
                  бесплатные продукты
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid gap-8 md:grid-cols-4 text-center">
            <div>
              <div className="text-4xl font-bold text-primary mb-2">150+</div>
              <div className="text-muted-foreground">Автоматов</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary mb-2">50+</div>
              <div className="text-muted-foreground">Локаций</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary mb-2">10K+</div>
              <div className="text-muted-foreground">Клиентов</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary mb-2">100K+</div>
              <div className="text-muted-foreground">Покупок</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Хотите установить автомат в своём помещении?
          </h2>
          <p className="text-xl opacity-90 mb-8 max-w-2xl mx-auto">
            Мы предлагаем выгодные условия сотрудничества для бизнес-центров,
            торговых центров, учебных заведений и других организаций.
          </p>
          <Button size="lg" variant="secondary" asChild>
            <Link href="/cooperation">
              Оставить заявку
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  )
}
