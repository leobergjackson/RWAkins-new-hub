// Built by vsrupeshkumar
"use client";

import React, { FC, ReactNode, useEffect, useRef, useMemo } from 'react';
import { ConnectionProvider, WalletProvider, useWallet } from '@arbitrum-sepolia/wallet-adapter-react';
import { WalletAdapterNetwork } from '@arbitrum-sepolia/wallet-adapter-base';
import { PhantomWalletAdapter, SolflareWalletAdapter, CoinbaseWalletAdapter } from '@arbitrum-sepolia/wallet-adapter-wallets';
import {
    WalletModalProvider,
} from '@arbitrum-sepolia/wallet-adapter-react-ui';
import { clusterApiUrl } from '@arbitrum-sepolia/web3.js';

const LANDING_URL = 'https://palm-flow-ai.vercel.app/';

function WalletDisconnectHandler() {
    const { connected } = useWallet();
    const wasConnected = useRef(false);

    useEffect(() => {
        if (connected) {
            wasConnected.current = true;
        } else if (wasConnected.current) {
            wasConnected.current = false;
            window.location.href = LANDING_URL;
        }
    }, [connected]);

    return null;
}

export const WalletContextProvider: FC<{ children: ReactNode }> = ({ children }) => {
    const network = WalletAdapterNetwork.Devnet;

    const endpoint = useMemo(() => clusterApiUrl(network), [network]);

    const wallets = useMemo(
        () => [
            new PhantomWalletAdapter(),
            new SolflareWalletAdapter(),
            new CoinbaseWalletAdapter(),
        ],
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [network]
    );

    return (
        <ConnectionProvider endpoint={endpoint}>
            <WalletProvider wallets={wallets} autoConnect>
                <WalletModalProvider>
                    <WalletDisconnectHandler />
                    {children}
                </WalletModalProvider>
            </WalletProvider>
        </ConnectionProvider>
    );
};
