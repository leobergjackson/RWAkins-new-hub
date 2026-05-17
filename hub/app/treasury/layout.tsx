import type { Metadata } from 'next'

const title = 'Treasury AI — Kubryx'
const description = 'Autonomous treasury management on Solana'
const url = 'https://kubryx.vercel.app/treasury'

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
