'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { HelpPanel } from '@/components/help/HelpPanel'

interface HelpContextType {
  isOpen: boolean
  open: () => void
  close: () => void
  toggle: () => void
}

const HelpContext = createContext<HelpContextType | undefined>(undefined)

export function HelpProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)

  // Global keyboard shortcut handler for ?
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ? to open help (when not in input)
      if (
        e.key === '?' &&
        !['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName) &&
        !(e.target as HTMLElement).isContentEditable
      ) {
        e.preventDefault()
        setIsOpen(true)
        return
      }

      // F1 to toggle help
      if (e.key === 'F1') {
        e.preventDefault()
        setIsOpen((prev) => !prev)
        return
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  const contextValue: HelpContextType = {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    toggle: () => setIsOpen((prev) => !prev),
  }

  return (
    <HelpContext.Provider value={contextValue}>
      {children}
      <HelpPanel isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </HelpContext.Provider>
  )
}

export function useHelpContext() {
  const context = useContext(HelpContext)
  if (context === undefined) {
    throw new Error('useHelpContext must be used within a HelpProvider')
  }
  return context
}
