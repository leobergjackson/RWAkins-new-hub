// Built by vsrupeshkumar
import { create } from 'zustand';

interface PalmFlowState {
  isWalletConnected: boolean;
  walletAddress: string | null;
  setWalletConnected: (connected: boolean, address: string | null) => void;
  
  activeTab: string;
  setActiveTab: (tab: string) => void;
  
  treasuryBalance: number;
  setTreasuryBalance: (balance: number) => void;
}

export const useStore = create<PalmFlowState>((set) => ({
  isWalletConnected: false,
  walletAddress: null,
  setWalletConnected: (connected, address) => set({ isWalletConnected: connected, walletAddress: address }),
  
  activeTab: 'dashboard',
  setActiveTab: (tab) => set({ activeTab: tab }),
  
  treasuryBalance: 124592.00,
  setTreasuryBalance: (balance) => set({ treasuryBalance: balance }),
}));
