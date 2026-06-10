// Built by vsrupeshkumar
import type { Metadata } from 'next'
import CreditNav from './_components/CreditNav'

const title = 'Credit Passport — RWAkins'
const description = 'AI-powered on-chain credit passport on Mantle blockchain'
const url = 'https://kubryx.vercel.app/credit'

export const metadata: Metadata = {
  metadataBase: new URL('https://kubryx.vercel.app'),
  title,
  description,
  openGraph: {
    title,
    description,
    url,
    siteName: 'RWAkins',
    type: 'website',
    images: [{ url: '/og-default.svg', width: 1200, height: 630 }],
  },
  twitter: { card: 'summary_large_image', title, description, images: ['/og-default.svg'] },
}

export default function CreditLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: '#ffffff',
        minHeight: '100vh',
        color: '#0A0F2E',
        fontFamily: 'var(--font-jakarta), "Plus Jakarta Sans", system-ui, sans-serif',
      }}
    >
      <CreditNav />
      {children}
    </div>
  )
}
