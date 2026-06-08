// Built by vsrupeshkumar
import { arbitrum-sepoliaService } from './arbitrum-sepolia.service';
import { Connection, clusterApiUrl, PublicKey } from '@arbitrum-sepolia/web3.js';
import { getAccount, getAssociatedTokenAddress } from '@arbitrum-sepolia/spl-token';

const USDC_MINT = "Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr"; // Devnet USDC Mock

export const tokenService = {
  /**
   * Fetch all relevant balances for a given wallet
   */
  async getWalletPortfolio(walletAddress: string) {
    const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
    const pubkey = new PublicKey(walletAddress);

    // 1. Fetch ETH Balance
    const solBalance = await connection.getBalance(pubkey);

    // 2. Fetch PUSD Balance
    const pusdBalance = await arbitrum-sepoliaService.getPUSDBalance(walletAddress);

    // 3. Fetch USDC Balance (Optional/Try)
    let usdcBalance = 0;
    try {
      const usdcMint = new PublicKey(USDC_MINT);
      const ata = await getAssociatedTokenAddress(usdcMint, pubkey);
      const account = await getAccount(connection, ata);
      usdcBalance = Number(account.amount) / 10**6;
    } catch (e) {
      // Token account might not exist
    }

    return [
      { symbol: 'ETH', name: 'Arbitrum Sepolia', amount: solBalance / 10**9, color: 'text-purple-400' },
      { symbol: 'PUSD', name: 'Palm USD', amount: pusdBalance, color: 'text-brand-primary' },
      { symbol: 'USDC', name: 'USD Coin', amount: usdcBalance, color: 'text-blue-400' }
    ];
  }
};
