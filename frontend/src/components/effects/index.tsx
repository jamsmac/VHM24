import dynamic from 'next/dynamic'

// Dynamic import for SSR safety (WebGL requires browser)
export const LiquidEther = dynamic(
  () => import('./LiquidEther'),
  {
    ssr: false,
    loading: () => (
      <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-slate-900 to-slate-800" />
    )
  }
)

export { liquidPresets, VENDHUB_THEMES } from './liquidPresets'
export type { LiquidPreset, VendHubTheme } from './liquidPresets'
