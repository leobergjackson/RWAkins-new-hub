import { useState, useCallback } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/hooks/useTheme";
import CustomCursor from "@/components/shared/CustomCursor";
import SplashScreen from "@/components/shared/SplashScreen";

import Index from "@/pages/Index";
import NotFound from "@/pages/NotFound";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Dashboard from "@/pages/Dashboard";
import Wallets from "@/pages/Wallets";
import Creators from "@/pages/Creators";
import Tips from "@/pages/Tips";
import Escrow from "@/pages/Escrow";
import Reasoning from "@/pages/Reasoning";
import Playground from "@/pages/Playground";
import Architecture from "@/pages/Architecture";
import Build from "@/pages/Build";
import Timeline from "@/pages/Timeline";
import Demo from "@/pages/Demo";
import Security from "@/pages/Security";
import Payments from "@/pages/Payments";
import SendMoney from "@/pages/SendMoney";
import DeFi from "@/pages/DeFi";
import Analytics from "@/pages/Analytics";
import Explorer from "@/pages/Explorer";
import Memory from "@/pages/Memory";
import Treasury from "@/pages/Treasury";
import Monitoring from "@/pages/Monitoring";
import Compliance from "@/pages/Compliance";
import Privacy from "@/pages/Privacy";
import Chat from "@/pages/Chat";
import Governance from "@/pages/Governance";
import DataSources from "@/pages/DataSources";
import Reputation from "@/pages/Reputation";
import Trading from "@/pages/Trading";
import Notifications from "@/pages/Notifications";
import Goals from "@/pages/Goals";
import Contacts from "@/pages/Contacts";
import Economics from "@/pages/Economics";
import Marketplace from "@/pages/Marketplace";
import Multisig from "@/pages/Multisig";
import SettingsPage from "@/pages/Settings";
import Sustainability from "@/pages/Sustainability";
import QRCodes from "@/pages/QRCodes";
import Swarm from "@/pages/Swarm";
import TransactionsPage from "@/pages/Transactions";
import Engagement from "@/pages/Engagement";
import Status from "@/pages/Status";
import Changelog from "@/pages/Changelog";
import AuditTrail from "@/pages/AuditTrail";
import GitHubTipping from "@/pages/GitHubTipping";
import WalletBrain from "@/pages/WalletBrain";
import PortfolioAnalytics from "@/pages/PortfolioAnalytics";
import FeeComparison from "@/pages/FeeComparison";
import AgentDialogue from "@/pages/AgentDialogue";
import TipPools from "@/pages/TipPools";
import LiveProof from "@/pages/LiveProof";
import ReasoningReplay from "@/pages/ReasoningReplay";
import EconomicSimulator from "@/pages/EconomicSimulator";
import ChainExplorer from "@/pages/ChainExplorer";
import AgentPerformance from "@/pages/AgentPerformance";
import ApiPlayground from "@/pages/ApiPlayground";
import GaslessDemo from "@/pages/GaslessDemo";
import CreatorLeaderboard from "@/pages/CreatorLeaderboard";
import RiskDashboard from "@/pages/RiskDashboard";

const queryClient = new QueryClient();

const App = () => {
  const [splashDone, setSplashDone] = useState(() =>
    sessionStorage.getItem("colibri-splash-done") === "true"
  );

  const handleSplashDone = useCallback(() => {
    sessionStorage.setItem("colibri-splash-done", "true");
    setSplashDone(true);
  }, []);

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider delayDuration={0}>
          <CustomCursor />
          <Toaster position="bottom-right" richColors theme="dark" />
          {!splashDone && <SplashScreen onDone={handleSplashDone} />}
          {splashDone && (
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route element={<DashboardLayout />}>
                  <Route path="/send" element={<SendMoney />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/wallets" element={<Wallets />} />
                  <Route path="/creators" element={<Creators />} />
                  <Route path="/tips" element={<Tips />} />
                  <Route path="/escrow" element={<Escrow />} />
                  <Route path="/reasoning" element={<Reasoning />} />
                  <Route path="/demo" element={<Demo />} />
                  <Route path="/security" element={<Security />} />
                  <Route path="/payments" element={<Payments />} />
                  <Route path="/defi" element={<DeFi />} />
                  <Route path="/analytics" element={<Analytics />} />
                  <Route path="/playground" element={<Playground />} />
                  <Route path="/architecture" element={<Architecture />} />
                  <Route path="/build" element={<Build />} />
                  <Route path="/timeline" element={<Timeline />} />
                  <Route path="/memory" element={<Memory />} />
                  <Route path="/treasury" element={<Treasury />} />
                  <Route path="/monitoring" element={<Monitoring />} />
                  <Route path="/compliance" element={<Compliance />} />
                  <Route path="/privacy" element={<Privacy />} />
                  <Route path="/chat" element={<Chat />} />
                  <Route path="/governance" element={<Governance />} />
                  <Route path="/data-sources" element={<DataSources />} />
                  <Route path="/reputation" element={<Reputation />} />
                  <Route path="/trading" element={<Trading />} />
                  <Route path="/notifications" element={<Notifications />} />
                  <Route path="/goals" element={<Goals />} />
                  <Route path="/contacts" element={<Contacts />} />
                  <Route path="/economics" element={<Economics />} />
                  <Route path="/marketplace" element={<Marketplace />} />
                  <Route path="/multisig" element={<Multisig />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="/sustainability" element={<Sustainability />} />
                  <Route path="/qr" element={<QRCodes />} />
                  <Route path="/swarm" element={<Swarm />} />
                  <Route path="/transactions" element={<TransactionsPage />} />
                  <Route path="/engagement" element={<Engagement />} />
                  <Route path="/status" element={<Status />} />
                  <Route path="/changelog" element={<Changelog />} />
                  <Route path="/explorer" element={<Explorer />} />
                  <Route path="/audit-trail" element={<AuditTrail />} />
                  <Route path="/github-tipping" element={<GitHubTipping />} />
                  <Route path="/wallet-brain" element={<WalletBrain />} />
                  <Route path="/portfolio-analytics" element={<PortfolioAnalytics />} />
                  <Route path="/fee-comparison" element={<FeeComparison />} />
                  <Route path="/agent-dialogue" element={<AgentDialogue />} />
                  <Route path="/tip-pools" element={<TipPools />} />
                  <Route path="/live-proof" element={<LiveProof />} />
                  <Route path="/reasoning-replay" element={<ReasoningReplay />} />
                  <Route path="/economic-simulator" element={<EconomicSimulator />} />
                  <Route path="/chain-explorer" element={<ChainExplorer />} />
                  <Route path="/agent-performance" element={<AgentPerformance />} />
                  <Route path="/api-playground" element={<ApiPlayground />} />
                  <Route path="/gasless-demo" element={<GaslessDemo />} />
                  <Route path="/creator-leaderboard" element={<CreatorLeaderboard />} />
                  <Route path="/risk-dashboard" element={<RiskDashboard />} />
                </Route>
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          )}
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
};

export default App;
