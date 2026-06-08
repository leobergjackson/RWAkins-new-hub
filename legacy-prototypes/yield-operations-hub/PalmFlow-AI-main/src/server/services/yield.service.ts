// Built by vsrupeshkumar
import { transactionService } from './transaction.service';

// Yield vault is tracked off-chain until a real vault program is deployed
export const yieldService = {
  async routeToYield(amount: number) {
    try {
      console.log(`--- Routing ${amount} PUSD to Yield Engine (simulated) ---`);

      await transactionService.createTransaction({
        amount: amount,
        type: 'yield_investment',
        description: `Autonomous Yield Routing: ${amount.toFixed(2)} PUSD allocated to protocol vault`,
        txHash: undefined
      });

      return { success: true };
    } catch (error) {
      console.error('Yield routing failed:', error);
      throw error;
    }
  }
};
