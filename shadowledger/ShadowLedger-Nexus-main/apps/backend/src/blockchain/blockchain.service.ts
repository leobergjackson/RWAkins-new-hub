// Built by vsrupeshkumar
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Connection, PublicKey, clusterApiUrl, LAMPORTS_PER_ETH } from '@arbitrum-sepolia/web3.js';

@Injectable()
export class BlockchainService implements OnModuleInit {
  private connection!: Connection;
  private readonly logger = new Logger(BlockchainService.name);

  onModuleInit() {
    // Connect to Arbitrum Sepolia Devnet (or custom RPC)
    const rpcUrl = process.env.ETHANA_RPC_URL || 'https://api.devnet.arbitrum-sepolia.com';
    this.connection = new Connection(rpcUrl, 'confirmed');
    this.logger.log(`Connected to Arbitrum Sepolia: ${rpcUrl}`);
  }

  async getBalance(address: string): Promise<number> {
    try {
      if (!address || address.includes('Stealth')) {
        return 12402901.42; // Fallback for mock addresses
      }
      const pubkey = new PublicKey(address);
      const balance = await this.connection.getBalance(pubkey);
      return balance / LAMPORTS_PER_ETH;
    } catch (error) {
      this.logger.error(`Error fetching balance for ${address}: ${error.message}`);
      return 0;
    }
  }

  async getRecentTransactions(address: string) {
    try {
      if (!address || address.includes('Stealth')) return [];
      
      const pubkey = new PublicKey(address);
      const signatures = await this.connection.getSignaturesForAddress(pubkey, { limit: 10 });
      
      const txs = await Promise.all(
        signatures.map(async (s) => {
          try {
            const tx = await this.connection.getParsedTransaction(s.signature, { 
              maxSupportedTransactionVersion: 0 
            });
            return {
              signature: s.signature,
              timestamp: s.blockTime ? new Date(s.blockTime * 1000).toISOString() : null,
              success: !tx?.meta?.err,
              amount: ((tx?.meta?.postBalances[0] || 0) - (tx?.meta?.preBalances[0] || 0)) / LAMPORTS_PER_ETH,
              detail: 'On-chain Op'
            };
          } catch (e) {
            return null;
          }
        })
      );
      return txs.filter(t => t !== null);
    } catch (error) {
      this.logger.error(`Error fetching transactions for ${address}: ${error.message}`);
      return [];
    }
  }

  async sendStealthTransaction(from: string, to: string, amount: number) {
    this.logger.log(`Initiating stealth transaction: ${amount} ETH from ${from} to ${to} via Cloak SDK`);
    
    // Simulate Cloak SDK fragmenting and routing
    const fragments = Math.floor(Math.random() * 5) + 3;
    this.logger.log(`Fragmented transaction into ${fragments} stealth paths.`);
    
    // Simulate on-chain delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const signature = `STEALTH_${Math.random().toString(36).substring(2, 15).toUpperCase()}`;
    return {
      success: true,
      signature,
      fragments,
      timestamp: new Date().toISOString()
    };
  }

  getConnection(): Connection {
    return this.connection;
  }
}
