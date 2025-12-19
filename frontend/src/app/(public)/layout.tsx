import type { Metadata } from 'next'
import Link from 'next/link'
import { Coffee, MapPin, Phone, Menu } from 'lucide-react'

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
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Coffee className="h-8 w-8 text-primary" />
            <span className="font-bold text-xl">VendHub</span>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            <Link
              href="/locations"
              className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
            >
              <MapPin className="h-4 w-4" />
              Локации
            </Link>
            <Link
              href="/cooperation"
              className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Phone className="h-4 w-4" />
              Сотрудничество
            </Link>
          </nav>

          {/* Mobile menu button */}
          <button className="md:hidden p-2">
            <Menu className="h-6 w-6" />
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-muted/50 border-t py-8">
        <div className="container mx-auto px-4">
          <div className="grid gap-8 md:grid-cols-3">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Coffee className="h-6 w-6 text-primary" />
                <span className="font-bold">VendHub</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Современные вендинговые решения для вашего бизнеса и удобства клиентов.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Навигация</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/locations" className="text-muted-foreground hover:text-foreground">
                    Локации
                  </Link>
                </li>
                <li>
                  <Link href="/cooperation" className="text-muted-foreground hover:text-foreground">
                    Сотрудничество
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Контакты</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>support@vendhub.uz</li>
                <li>+998 71 123 45 67</li>
              </ul>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} VendHub. Все права защищены.
          </div>
        </div>
      </footer>
    </div>
  )
}
