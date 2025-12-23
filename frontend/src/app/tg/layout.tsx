'use client'

import { TelegramProvider } from './components/TelegramProvider'
import Script from 'next/script'
import './telegram.css'

export default function TelegramMiniAppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      {/* Telegram WebApp SDK */}
      <Script
        src="https://telegram.org/js/telegram-web-app.js"
        strategy="beforeInteractive"
      />

      <TelegramProvider>
        <div className="tg-app">
          {children}
        </div>
      </TelegramProvider>
    </>
  )
}
