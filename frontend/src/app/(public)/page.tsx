'use client'

import Link from 'next/link'
import { Coffee, MapPin, Smartphone, Gift, ArrowRight, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LiquidEther, liquidPresets } from '@/components/effects'
import { useLiquidSettings } from '@/hooks/useLiquidSettings'

export default function LandingPage() {
  const { enabled } = useLiquidSettings()

  return (
    <div>
      {/* Hero Section with LiquidEther */}
      <section className="relative min-h-[80vh] flex items-center bg-slate-950 overflow-hidden">
        {/* LiquidEther Background */}
        {enabled && (
          <div className="absolute inset-0 opacity-50">
            <LiquidEther {...liquidPresets.landing} />
          </div>
        )}

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/30 via-transparent to-slate-950 z-10" />

        <div className="container mx-auto px-4 relative z-20">
          <div className="max-w-4xl mx-auto text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-sm text-slate-300 mb-8">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span>Новое поколение вендинга</span>
            </div>

            <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
              <span className="text-white">Свежий кофе и снеки</span>
              <br />
              <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                рядом с вами
              </span>
            </h1>
            <p className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto">
              Сеть современных вендинговых автоматов VendHub. Найдите ближайший
              автомат, сканируйте QR-код и получайте бонусы за каждую покупку.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 text-white border-0 shadow-lg shadow-purple-500/30 text-lg px-8 py-6"
                asChild
              >
                <Link href="/locations">
                  <MapPin className="mr-2 h-5 w-5" />
                  Найти автомат
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10 backdrop-blur-sm text-lg px-8 py-6"
                asChild
              >
                <Link href="/cooperation">
                  Стать партнёром
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>

            {/* Floating stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-16 max-w-3xl mx-auto">
              {[
                { value: '150+', label: 'Автоматов' },
                { value: '50+', label: 'Локаций' },
                { value: '10K+', label: 'Клиентов' },
                { value: '100K+', label: 'Покупок' },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4"
                >
                  <div className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                    {stat.value}
                  </div>
                  <div className="text-sm text-slate-400">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-gradient-to-b from-slate-950 to-slate-900">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Как это работает
            </h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              Три простых шага до вашего любимого напитка
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-3 max-w-5xl mx-auto">
            {[
              {
                icon: MapPin,
                title: 'Найдите автомат',
                description: 'Используйте карту для поиска ближайшего автомата VendHub в вашем городе',
                color: 'from-blue-500 to-cyan-500',
              },
              {
                icon: Smartphone,
                title: 'Сканируйте QR-код',
                description: 'Сканируйте QR-код на автомате через Telegram бот для просмотра меню и оплаты',
                color: 'from-purple-500 to-pink-500',
              },
              {
                icon: Gift,
                title: 'Получайте бонусы',
                description: 'Копите баллы за каждую покупку и обменивайте их на скидки и бесплатные продукты',
                color: 'from-amber-500 to-orange-500',
              },
            ].map((feature, index) => (
              <div
                key={feature.title}
                className="relative group"
              >
                {/* Step number */}
                <div className="absolute -top-4 -left-4 w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-lg font-bold text-white">
                  {index + 1}
                </div>

                <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8 h-full transition-all hover:bg-slate-800/70 hover:border-slate-600/50 hover:-translate-y-1">
                  <div className={`mb-6 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br ${feature.color} shadow-lg`}>
                    <feature.icon className="h-7 w-7 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-3">{feature.title}</h3>
                  <p className="text-slate-400 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-slate-900 relative overflow-hidden">
        {/* Decorative gradient orbs */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-sm text-slate-300 mb-6">
              <Coffee className="w-4 h-4 text-amber-400" />
              <span>Для бизнеса</span>
            </div>

            <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
              Хотите установить автомат в своём помещении?
            </h2>
            <p className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto">
              Мы предлагаем выгодные условия сотрудничества для бизнес-центров,
              торговых центров, учебных заведений и других организаций.
            </p>
            <Button
              size="lg"
              className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 text-white border-0 shadow-lg shadow-purple-500/30 text-lg px-8 py-6"
              asChild
            >
              <Link href="/cooperation">
                Оставить заявку
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
