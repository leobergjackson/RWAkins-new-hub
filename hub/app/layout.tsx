import type { Metadata } from 'next'
import { Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { Toaster } from 'sonner'

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-jakarta',
  display: 'swap',
})

const mono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['500', '600'],
  variable: '--font-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Kubryx — The Financial OS for Web3 & Beyond',
  description: 'One platform. Eight powerful tools. Credit scoring, inheritance vaults, private trading, DeFi lending, treasury automation, and AI agents — all on-chain across QIE, Solana, Stellar, and Ethereum.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${jakarta.variable} ${mono.variable}`} suppressHydrationWarning>
      <body style={{ fontFamily: 'var(--font-jakarta), "Plus Jakarta Sans", system-ui, sans-serif' }}>
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#fff',
              border: '1px solid #E5E7EB',
              color: '#0A0F2E',
              fontFamily: 'var(--font-jakarta), sans-serif',
            },
          }}
        />
      </body>
    </html>
  )
}
