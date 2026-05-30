// Built by vsrupeshkumar
import type { Metadata } from "next";
import { Space_Grotesk, Geist_Mono } from "next/font/google";
import "./globals.css";
import '@arbitrum-sepolia/wallet-adapter-react-ui/styles.css';
import { Navbar } from "@/components/layout/Navbar";
import { WalletContextProvider } from "@/components/wallet/WalletContextProvider";
import QueryProvider from "@/components/providers/QueryProvider";
import { CommandBar } from "@/components/ui/CommandBar";
import { BlockchainProvider } from "@/components/providers/BlockchainProvider";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PalmFlow AI | Autonomous Financial OS",
  description: "Autonomous AI Treasury & Payment Network Powered by PUSD on Arbitrum Sepolia.",
};

import { BottomDock } from "@/components/layout/BottomDock";
import { TopHeader } from "@/components/layout/TopHeader";
import { BackgroundSystem } from "@/components/ui/BackgroundSystem";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { WalletGuard } from "@/components/wallet/WalletGuard";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${geistMono.variable}`}>
      <body className="min-h-screen antialiased selection:bg-accent-cyan/20 relative pb-32">
        <QueryProvider>
          <WalletContextProvider>
            <BlockchainProvider>
              <BackgroundSystem />
              <ToastProvider />
              <WalletGuard />
              <TopHeader />
              <main className="relative z-10 min-h-screen pt-20 px-6">
                {children}
              </main>
              <BottomDock />
            </BlockchainProvider>
          </WalletContextProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
