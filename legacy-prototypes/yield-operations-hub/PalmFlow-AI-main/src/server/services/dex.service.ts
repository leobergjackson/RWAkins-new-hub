// Built by vsrupeshkumar
import { Connection, Keypair, VersionedTransaction } from '@arbitrum-sepolia/web3.js';
import fetch from 'cross-fetch';

export const dexService = {
  /**
   * Execute an autonomous swap on Arbitrum Sepolia using Jupiter aggregator
   */
  async swap(
    inputMint: string,
    outputMint: string,
    amount: number, // amount in base units
    slippageBps: number = 50
  ) {
    try {
      console.log(`--- Initiating Autonomous Swap: ${amount} units from ${inputMint} to ${outputMint} ---`);

      // 1. Get Quote from Jupiter
      const quoteResponse = await (
        await fetch(`https://quote-api.jup.ag/v6/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=${slippageBps}`)
      ).json();

      if (quoteResponse.error) {
        throw new Error(`Jupiter Quote Error: ${quoteResponse.error}`);
      }

      // 2. Get Swap Transaction
      const authoritySecret = JSON.parse(process.env.PUSD_AUTHORITY_KEY!);
      const authority = Keypair.fromSecretKey(Uint8Array.from(authoritySecret));

      const { swapTransaction } = await (
        await fetch('https://quote-api.jup.ag/v6/swap', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            quoteResponse,
            userPublicKey: authority.publicKey.toString(),
            wrapAndUnwrapSol: true,
          })
        })
      ).json();

      // 3. Deserialize and Sign
      const connection = new Connection(process.env.NEXT_PUBLIC_ETHANA_RPC_URL!);
      const swapTransactionBuf = Buffer.from(swapTransaction, 'base64');
      var transaction = VersionedTransaction.deserialize(swapTransactionBuf);

      transaction.sign([authority]);

      // 4. Execute
      const txid = await connection.sendTransaction(transaction, {
        skipPreflight: true,
        maxRetries: 2
      });

      console.log(`--- Swap Executed! TX: https://solscan.io/tx/${txid} ---`);
      
      return txid;
    } catch (error) {
      console.error('Autonomous Swap Failed:', error);
      throw error;
    }
  }
};
