'use client'

import { ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface MobileHeaderProps {
  title: string
  showBack?: boolean
  onBack?: () => void
  actions?: React.ReactNode
}

export function MobileHeader({ title, showBack = false, onBack, actions }: MobileHeaderProps) {
  const router = useRouter()

  const handleBack = () => {
    if (onBack) {
      onBack()
    } else {
      router.back()
    }
  }

  return (
    <header className="md:hidden sticky top-0 left-0 right-0 bg-white border-b border-gray-200 z-30 safe-area-inset-top">
      <div className="flex items-center justify-between px-4 py-3">
        {/* Left side */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {showBack && (
            <button
              onClick={handleBack}
              className="p-2 -ml-2 rounded-lg active:bg-gray-100 touch-manipulation"
              aria-label="Назад"
            >
              <ArrowLeft className="h-6 w-6 text-gray-700" />
            </button>
          )}

          <h1 className="text-lg font-semibold text-gray-900 truncate">
            {title}
          </h1>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {actions}
        </div>
      </div>
    </header>
  )
}
