// Built by vsrupeshkumar
import type { Metadata } from 'next'

const title = 'AI Lending — Kubryx'
const description = 'AI-negotiated RWA lending (USDY, mETH) on Mantle Network'
const url = 'https://kubryx.vercel.app/lend'

export const metadata: Metadata = {
  metadataBase: new URL('https://kubryx.vercel.app'),
  title,
  description,
  openGraph: {
    title, description, url, siteName: 'Kubryx', type: 'website',
    images: [{ url: '/og-default.svg', width: 1200, height: 630 }],
  },
  twitter: { card: 'summary_large_image', title, description, images: ['/og-default.svg'] },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
