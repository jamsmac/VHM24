'use client'

import { CollapsibleSidebar } from '@/components/layout/CollapsibleSidebar'
import { DashboardTour } from '@/components/layout/DashboardTour'
import { Header } from '@/components/layout/Header'
import { MobileNav } from '@/components/layout/MobileNav'
import { QueryProvider } from '@/providers/QueryProvider'
import { CommandPaletteProvider } from '@/providers/CommandPaletteProvider'
import { HelpProvider } from '@/providers/HelpProvider'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { LiquidEther, liquidPresets } from '@/components/effects'
import { useLiquidSettings } from '@/hooks/useLiquidSettings'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import 'leaflet/dist/leaflet.css'
import { Toaster } from 'sonner'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { isAuthenticated, loading } = useAuth()
  const { enabled } = useLiquidSettings()

  useEffect(() => {
    // Only redirect if not loading and not authenticated
    if (!loading && !isAuthenticated) {
      router.push('/login')
    }
  }, [loading, isAuthenticated, router])

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Загрузка...</p>
        </div>
      </div>
    )
  }

  // Don't render dashboard if not authenticated (redirect will happen via useEffect)
  if (!isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Перенаправление...</p>
        </div>
      </div>
    )
  }

  return (
    <QueryProvider>
      <CommandPaletteProvider>
        <HelpProvider>
          <ErrorBoundary>
          {/* Skip navigation links for keyboard users */}
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-4 focus:left-4 focus:bg-primary focus:text-primary-foreground focus:px-4 focus:py-2 focus:rounded-md focus:shadow-lg"
          >
            Перейти к основному содержимому
          </a>
          <div className="flex h-screen bg-gradient-to-br from-stone-50 via-orange-50/30 to-amber-50/20 relative">
            {/* Subtle LiquidEther background effect */}
            {enabled && (
              <div className="fixed inset-0 z-0 opacity-20 pointer-events-none">
                <LiquidEther {...liquidPresets.dashboard} />
              </div>
            )}
            <CollapsibleSidebar />
            <div className="flex-1 flex flex-col overflow-hidden relative z-10">
              <Header />
              <main id="main-content" className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-6" tabIndex={-1}>
                {children}
              </main>
            </div>
            <MobileNav />
          </div>
          <ToastContainer position="top-right" autoClose={3000} />
          <Toaster position="top-right" richColors />
          <DashboardTour />
          </ErrorBoundary>
        </HelpProvider>
      </CommandPaletteProvider>
    </QueryProvider>
  )
}
