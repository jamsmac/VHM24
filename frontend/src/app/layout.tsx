import type { Metadata, Viewport } from 'next'
import './globals.css'
import { ThemeProvider } from '@/providers/ThemeProvider'
import { I18nProvider } from '@/providers/I18nProvider'
import { PWAInstaller } from '@/components/PWAInstaller'

// System font stack with Inter-like sans-serif fonts
const fontClassName = 'font-sans'

export const metadata: Metadata = {
  title: 'VendHub Manager',
  description: 'Vending Machine Management System',
  applicationName: 'VendHub Manager',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'VendHub',
  },
  formatDetection: {
    telephone: false,
  },
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/icon-152x152.png', sizes: '152x152', type: 'image/png' },
    ],
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#4f46e5',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body className={fontClassName}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <I18nProvider>
            {children}
            <PWAInstaller />
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
