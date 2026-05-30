// Built by vsrupeshkumar
/**
 * Lendora AI - Ethereum Wallet Integration
 * Supports MetaMask, WalletConnect, and other EIP-1193 wallets
 */

export type WalletName = 'metamask' | 'walletconnect' | 'coinbase' | 'trust' | 'rainbow';

interface EthereumProvider {
    isMetaMask?: boolean;
    isCoinbaseWallet?: boolean;
    isTrust?: boolean;
    request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
    on: (event: string, handler: (...args: unknown[]) => void) => void;
    removeListener: (event: string, handler: (...args: unknown[]) => void) => void;
    selectedAddress?: string;
    chainId?: string;
}

interface WalletInfo {
    name: WalletName;
    displayName: string;
    installed: boolean;
    icon?: string;
}

interface WalletState {
    connected: boolean;
    address: string | null;
    chainId: number | null;
    balance: string;
    network: string;
}

// Chain configurations
const CHAIN_CONFIG: Record<number, { name: string; symbol: string; rpcUrl: string; explorerUrl: string }> = {
    421614: { name: 'Arbitrum Sepolia', symbol: 'ETH', rpcUrl: 'https://sepolia-rollup.arbitrum.io/rpc', explorerUrl: 'https://sepolia.arbiscan.io' },
};

/**
 * Get the Ethereum provider from window
 */
function getEthereumProvider(): EthereumProvider | undefined {
    if (typeof window !== 'undefined') {
        return (window as Window & { ethereum?: EthereumProvider }).ethereum;
    }
    return undefined;
}

/**
 * Get network name from chain ID
 */
function getNetworkName(chainId: number): string {
    return CHAIN_CONFIG[chainId]?.name || `Chain ${chainId}`;
}

/**
 * Format ETH balance from wei
 */
function formatEthBalance(weiBalance: string): string {
    const wei = BigInt(weiBalance);
    const eth = Number(wei) / 1e18;
    return eth.toFixed(4);
}

/**
 * Shorten Ethereum address for display
 */
export function shortenAddress(address: string): string {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Get list of available wallets
 */
export function getAvailableWallets(): WalletInfo[] {
    const ethereum = getEthereumProvider();
    
    const wallets: WalletInfo[] = [
        {
            name: 'metamask',
            displayName: 'MetaMask',
            installed: !!ethereum?.isMetaMask,
        },
        {
            name: 'coinbase',
            displayName: 'Coinbase Wallet',
            installed: !!ethereum?.isCoinbaseWallet,
        },
        {
            name: 'trust',
            displayName: 'Trust Wallet',
            installed: !!ethereum?.isTrust,
        },
        {
            name: 'walletconnect',
            displayName: 'WalletConnect',
            installed: true, // Always available as it's a protocol
        },
        {
            name: 'rainbow',
            displayName: 'Rainbow',
            installed: false, // Would need specific detection
        },
    ];

    // If ethereum exists but no specific wallet detected, assume it's an injected wallet
    if (ethereum && !wallets.some(w => w.installed && w.name !== 'walletconnect')) {
        wallets[0].installed = true; // Default to MetaMask-compatible
    }

    return wallets;
}

/**
 * Connect to an Ethereum wallet
 */
export async function connectWallet(walletName: WalletName): Promise<WalletState> {
    console.log(`[Wallet] Connecting to ${walletName}...`);
    
    const ethereum = getEthereumProvider();
    
    if (!ethereum) {
        throw new Error('No Ethereum wallet detected. Please install MetaMask or another Ethereum wallet.');
    }

    try {
        // Check if already connected
        if (ethereum.selectedAddress) {
            console.log('[Wallet] Already connected:', ethereum.selectedAddress);
            const address = ethereum.selectedAddress;
            const chainIdHex = await ethereum.request({ method: 'eth_chainId' }) as string;
            const chainId = parseInt(chainIdHex, 16);
            
            const balanceHex = await ethereum.request({
                method: 'eth_getBalance',
                params: [address, 'latest']
            }) as string;
            
            const balance = formatEthBalance(balanceHex);
            const network = getNetworkName(chainId);

            return {
                connected: true,
                address,
                chainId,
                balance,
                network,
            };
        }

        // Request account access with timeout
        let accounts: string[];
        try {
            accounts = await Promise.race([
                ethereum.request({ method: 'eth_requestAccounts' }) as Promise<string[]>,
                new Promise<never>((_, reject) => 
                    setTimeout(() => reject(new Error('Connection timeout. Please check your MetaMask extension.')), 30000)
                )
            ]);
        } catch (requestError: unknown) {
            // Check if user already approved in another tab/window
            if (ethereum.selectedAddress) {
                console.log('[Wallet] Found existing connection:', ethereum.selectedAddress);
                const address = ethereum.selectedAddress;
                const chainIdHex = await ethereum.request({ method: 'eth_chainId' }) as string;
                const chainId = parseInt(chainIdHex, 16);
                
                const balanceHex = await ethereum.request({
                    method: 'eth_getBalance',
                    params: [address, 'latest']
                }) as string;
                
                const balance = formatEthBalance(balanceHex);
                const network = getNetworkName(chainId);

                return {
                    connected: true,
                    address,
                    chainId,
                    balance,
                    network,
                };
            }
            throw requestError;
        }
        
        if (!accounts || accounts.length === 0) {
            throw new Error('No accounts found. Please unlock your wallet.');
        }

        const address = accounts[0];
        
        // Get chain ID
        const chainIdHex = await ethereum.request({ method: 'eth_chainId' }) as string;
        const chainId = parseInt(chainIdHex, 16);
        
        // Get balance
        const balanceHex = await ethereum.request({
            method: 'eth_getBalance',
            params: [address, 'latest']
        }) as string;
        
        const balance = formatEthBalance(balanceHex);
        const network = getNetworkName(chainId);

        console.log(`[Wallet] Connected: ${address} on ${network}`);

        return {
            connected: true,
            address,
            chainId,
            balance,
            network,
        };
    } catch (error: unknown) {
        console.error('[Wallet] Connection error:', error);
        
        if (error && typeof error === 'object' && 'code' in error) {
            const ethError = error as { code: number; message?: string };
            
            // User rejected the connection
            if (ethError.code === 4001) {
                throw new Error('Connection rejected. Please click "Connect" again and approve the connection in MetaMask.');
            }
            
            // Request already pending
            if (ethError.code === -32002) {
                // Wait a bit and check if connection was approved
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // Check if user approved in the meantime
                if (ethereum.selectedAddress) {
                    try {
                        const address = ethereum.selectedAddress;
                        const chainIdHex = await ethereum.request({ method: 'eth_chainId' }) as string;
                        const chainId = parseInt(chainIdHex, 16);
                        
                        const balanceHex = await ethereum.request({
                            method: 'eth_getBalance',
                            params: [address, 'latest']
                        }) as string;
                        
                        const balance = formatEthBalance(balanceHex);
                        const network = getNetworkName(chainId);

                        console.log('[Wallet] Connection approved, connected:', address);
                        return {
                            connected: true,
                            address,
                            chainId,
                            balance,
                            network,
                        };
                    } catch (checkError) {
                        console.error('[Wallet] Error checking pending connection:', checkError);
                    }
                }
                
                throw new Error('Connection request pending. Please check your MetaMask extension and approve the connection, then click "Retry" below.');
            }
        }
        
        // Check if error message indicates user needs to approve
        const errorMessage = error && typeof error === 'object' && 'message' in error 
            ? (error as { message: string }).message 
            : 'Failed to connect wallet. Please try again.';
        
        // If it's a timeout or similar, provide helpful message
        if (errorMessage.includes('timeout') || errorMessage.includes('pending')) {
            throw new Error('Connection request pending. Please check your MetaMask extension and approve the connection, then click "Retry" below.');
        }
        
        throw new Error(errorMessage);
    }
}

/**
 * Disconnect wallet (clears local state)
 */
export async function disconnectWallet(): Promise<void> {
    console.log('[Wallet] Disconnecting...');
    // Note: Most wallets don't support programmatic disconnection
    // The user needs to disconnect from within the wallet itself
}

/**
 * Get current wallet state
 */
export async function getWalletState(): Promise<WalletState | null> {
    const ethereum = getEthereumProvider();
    
    if (!ethereum) {
        return null;
    }

    try {
        // First try to get accounts (this works if already connected)
        let accounts: string[] = [];
        try {
            accounts = await ethereum.request({ method: 'eth_accounts' }) as string[];
        } catch {
            // If eth_accounts fails, try selectedAddress as fallback
            if (ethereum.selectedAddress) {
                accounts = [ethereum.selectedAddress];
            }
        }

        // If no accounts, check selectedAddress as fallback
        if (accounts.length === 0 && ethereum.selectedAddress) {
            accounts = [ethereum.selectedAddress];
        }

        if (accounts.length === 0) {
            return null;
        }

        const address = accounts[0];
        const chainIdHex = await ethereum.request({ method: 'eth_chainId' }) as string;
        const chainId = parseInt(chainIdHex, 16);
        
        const balanceHex = await ethereum.request({
            method: 'eth_getBalance',
            params: [address, 'latest']
        }) as string;
        
        return {
            connected: true,
            address,
            chainId,
            balance: formatEthBalance(balanceHex),
            network: getNetworkName(chainId),
        };
    } catch (err) {
        console.error('[Wallet] Error getting wallet state:', err);
        return null;
    }
}

/**
 * Switch to a different chain
 */
export async function switchChain(chainId: number): Promise<void> {
    const ethereum = getEthereumProvider();
    
    if (!ethereum) {
        throw new Error('No Ethereum wallet detected.');
    }

    const chainIdHex = `0x${chainId.toString(16)}`;

    try {
        await ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: chainIdHex }],
        });
    } catch (error: unknown) {
        // If chain not added, try to add it
        if (error && typeof error === 'object' && 'code' in error && (error as { code: number }).code === 4902) {
            const config = CHAIN_CONFIG[chainId];
            if (config) {
                await ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [{
                        chainId: chainIdHex,
                        chainName: config.name,
                        nativeCurrency: { name: config.symbol, symbol: config.symbol, decimals: 18 },
                        rpcUrls: [config.rpcUrl],
                        blockExplorerUrls: [config.explorerUrl],
                    }],
                });
            } else {
                throw new Error(`Chain ${chainId} not supported.`);
            }
        } else {
            throw error;
        }
    }
}

/**
 * Subscribe to wallet events
 */
export function subscribeToWalletEvents(
    onAccountsChanged: (accounts: string[]) => void,
    onChainChanged: (chainId: string) => void,
    onDisconnect: () => void
): () => void {
    const ethereum = getEthereumProvider();
    
    if (!ethereum) {
        return () => {};
    }

    const handleAccountsChanged = (accounts: unknown) => {
        onAccountsChanged(accounts as string[]);
    };

    const handleChainChanged = (chainId: unknown) => {
        onChainChanged(chainId as string);
    };

    const handleDisconnect = () => {
        onDisconnect();
    };

    ethereum.on('accountsChanged', handleAccountsChanged);
    ethereum.on('chainChanged', handleChainChanged);
    ethereum.on('disconnect', handleDisconnect);

    return () => {
        ethereum.removeListener('accountsChanged', handleAccountsChanged);
        ethereum.removeListener('chainChanged', handleChainChanged);
        ethereum.removeListener('disconnect', handleDisconnect);
    };
}

/**
 * Debug wallet state
 */
export function debugWalletState(): void {
    const ethereum = getEthereumProvider();
    console.log('=== Ethereum Wallet Debug ===');
    console.log('Provider exists:', !!ethereum);
    if (ethereum) {
        console.log('isMetaMask:', ethereum.isMetaMask);
        console.log('selectedAddress:', ethereum.selectedAddress);
        console.log('chainId:', ethereum.chainId);
    }
    console.log('Available wallets:', getAvailableWallets());
}
