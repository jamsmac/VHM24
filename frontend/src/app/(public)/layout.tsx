import type { Metadata } from 'next'
import Link from 'next/link'
import { Coffee, MapPin, Phone, Menu, LogIn } from 'lucide-react'
import { QueryProvider } from '@/providers/QueryProvider'
import { Toaster } from 'sonner'

export const metadata: Metadata = {
  title: 'VendHub - Вендинговые автоматы',
  description: 'Свежий кофе и снеки рядом с вами. Найдите ближайший автомат VendHub.',
}

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <QueryProvider>
    <div className="min-h-screen flex flex-col bg-slate-950">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-white/10">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center group-hover:shadow-lg group-hover:shadow-purple-500/30 transition-all">
              <Coffee className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-xl text-white">VendHub</span>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            <Link
              href="/locations"
              className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors"
            >
              <MapPin className="h-4 w-4" />
              Локации
            </Link>
            <Link
              href="/cooperation"
              className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors"
            >
              <Phone className="h-4 w-4" />
              Сотрудничество
            </Link>
            <Link
              href="/login"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 text-white transition-all"
            >
              <LogIn className="h-4 w-4" />
              Войти
            </Link>
          </nav>

          {/* Mobile menu button */}
          <button className="md:hidden p-2 text-white">
            <Menu className="h-6 w-6" />
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-white/10 py-12">
        <div className="container mx-auto px-4">
          <div className="grid gap-8 md:grid-cols-3">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <Coffee className="h-4 w-4 text-white" />
                </div>
                <span className="font-bold text-white">VendHub</span>
              </div>
              <p className="text-sm text-slate-400">
                Современные вендинговые решения для вашего бизнеса и удобства клиентов.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-4 text-white">Навигация</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/locations" className="text-slate-400 hover:text-white transition-colors">
                    Локации
                  </Link>
                </li>
                <li>
                  <Link href="/cooperation" className="text-slate-400 hover:text-white transition-colors">
                    Сотрудничество
                  </Link>
                </li>
                <li>
                  <Link href="/login" className="text-slate-400 hover:text-white transition-colors">
                    Панель управления
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4 text-white">Контакты</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li>support@vendhub.uz</li>
                <li>+998 71 123 45 67</li>
              </ul>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-white/10 text-center text-sm text-slate-500">
            © {new Date().getFullYear()} VendHub. Все права защищены.
          </div>
        </div>
      </footer>
    </div>
    <Toaster position="top-right" richColors />
    </QueryProvider>
  )
}
