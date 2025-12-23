'use client'

import { LiquidEther, liquidPresets } from '@/components/effects'
import { useLiquidSettings } from '@/hooks/useLiquidSettings'
import { Coffee } from 'lucide-react'
import Link from 'next/link'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { enabled, isMobile } = useLiquidSettings()

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* Left Side - Fluid Animation (hidden on mobile) */}
      <div className="hidden lg:block lg:w-1/2 relative overflow-hidden">
        {/* LiquidEther Background */}
        {enabled && (
          <LiquidEther {...liquidPresets.auth} />
        )}

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950/40 via-transparent to-slate-950/60 z-10" />

        {/* Overlay Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center p-12 z-20">
          <div className="max-w-md text-center">
            {/* Logo */}
            <div className="flex items-center justify-center gap-3 mb-8">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                <Coffee className="w-8 h-8 text-white" />
              </div>
              <span className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                VendHub
              </span>
            </div>

            <h2 className="text-4xl font-bold text-white mb-4">
              Добро пожаловать!
            </h2>
            <p className="text-xl text-slate-300 mb-12">
              Управляйте сетью вендинговых автоматов из одного места
            </p>

            {/* Features List */}
            <div className="space-y-4 text-left">
              <div className="flex items-center gap-4 p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10">
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-blue-400 text-xl">📊</span>
                </div>
                <div>
                  <div className="text-white font-medium">Real-time мониторинг</div>
                  <div className="text-slate-400 text-sm">31+ автоматов под контролем</div>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10">
                <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-purple-400 text-xl">💰</span>
                </div>
                <div>
                  <div className="text-white font-medium">Финансовая аналитика</div>
                  <div className="text-slate-400 text-sm">Выручка, расходы, прибыль</div>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10">
                <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-cyan-400 text-xl">🔔</span>
                </div>
                <div>
                  <div className="text-white font-medium">Умные уведомления</div>
                  <div className="text-slate-400 text-sm">Telegram + Email + Push</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-8 relative">
        {/* Mobile Logo */}
        <div className="absolute top-6 left-6 lg:hidden">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Coffee className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white">VendHub</span>
          </Link>
        </div>

        {/* Mobile subtle background */}
        {isMobile && (
          <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-purple-900/20 to-pink-900/20 pointer-events-none" />
        )}

        <div className="w-full max-w-md relative z-10">
          {/* Glass effect wrapper */}
          <div className="bg-slate-900/50 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
            {children}
          </div>

          {/* Footer */}
          <p className="mt-8 text-center text-xs text-slate-500">
            © 2025 VendHub. Все права защищены.
          </p>
        </div>
      </div>
    </div>
  )
}
