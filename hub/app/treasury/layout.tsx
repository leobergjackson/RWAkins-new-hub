import type { Metadata } from 'next'
import TreasuryNav from './_components/TreasuryNav'

const title = 'PalmFlow AI — Kubryx'
const description = 'Autonomous treasury & neural workforce management on Solana'
const url = 'https://kubryx.vercel.app/treasury'

export const metadata: Metadata = {
  metadataBase: new URL('https://kubryx.vercel.app'),
  title, description,
  openGraph: { title, description, url, siteName:'Kubryx', type:'website', images:[{ url:'/og-default.svg', width:1200, height:630 }] },
  twitter: { card:'summary_large_image', title, description, images:['/og-default.svg'] },
}

export default function TreasuryLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background:'#080810', minHeight:'100vh', color:'#fff', fontFamily:'"Inter",system-ui,sans-serif' }}>
      <TreasuryNav />
      {children}
    </div>
  )
}
