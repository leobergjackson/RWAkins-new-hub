// Built by vsrupeshkumar
"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useConnection, useWallet } from '@arbitrum-sepolia/wallet-adapter-react';
import { PublicKey } from '@arbitrum-sepolia/web3.js';
import { getAssociatedTokenAddress } from '@arbitrum-sepolia/spl-token';
import { useQueryClient } from '@tanstack/react-query';

interface BlockchainContextType {
  isSyncing: boolean;
  lastSignature: string | null;
}

const BlockchainContext = createContext<BlockchainContextType | undefined>(undefined);

export const BlockchainProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const queryClient = useQueryClient();
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSignature, setLastSignature] = useState<string | null>(null);

  useEffect(() => {
    if (!connection) return;

    // Listen for changes to the Treasury PUSD account
    const PUSD_MINT = new PublicKey(process.env.NEXT_PUBLIC_PUSD_MINT!);
    const TREASURY_PUBKEY = new PublicKey("zXELoTLXXNF6SxaT7v1bq3P62Nz9zeNHSaC8S7RZKmA");

    let subscriptionId: number;

    const setupSubscription = async () => {
      try {
        const treasuryAta = await getAssociatedTokenAddress(PUSD_MINT, TREASURY_PUBKEY);
        
        console.log('--- Establishing Neural Link to Arbitrum Sepolia ---');
        
        subscriptionId = connection.onAccountChange(
          treasuryAta,
          (accountInfo) => {
            console.log('--- Blockchain Event Detected: Treasury Updated ---');
            setIsSyncing(true);
            
            // Invalidate queries to trigger instant UI refresh
            queryClient.invalidateQueries({ queryKey: ['treasury-stats'] });
            queryClient.invalidateQueries({ queryKey: ['agents'] });
            
            setTimeout(() => setIsSyncing(false), 2000);
          },
          'confirmed'
        );
      } catch (error) {
        console.error('Failed to setup blockchain subscription:', error);
      }
    };

    setupSubscription();

    // --- SYSTEM HEARTBEAT ---
    // Keep the autonomous protocol alive by triggering periodic audits and payroll updates
    const heartbeatInterval = setInterval(async () => {
      try {
        await fetch('/api/system/heartbeat', { method: 'POST' });
        // After heartbeat, refresh metrics
        queryClient.invalidateQueries({ queryKey: ['treasury-stats'] });
        queryClient.invalidateQueries({ queryKey: ['streams'] });
      } catch (err) {
        console.warn('Heartbeat synchronization failed:', err);
      }
    }, 30000); // Every 30 seconds

    return () => {
      if (subscriptionId) connection.removeAccountChangeListener(subscriptionId);
      clearInterval(heartbeatInterval);
    };
  }, [connection, queryClient]);

  return (
    <BlockchainContext.Provider value={{ isSyncing, lastSignature }}>
      {children}
    </BlockchainContext.Provider>
  );
};

export const useBlockchain = () => {
  const context = useContext(BlockchainContext);
  if (context === undefined) {
    throw new Error('useBlockchain must be used within a BlockchainProvider');
  }
  return context;
};
