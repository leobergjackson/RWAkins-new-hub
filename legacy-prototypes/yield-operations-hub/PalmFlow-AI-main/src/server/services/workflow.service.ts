// Built by vsrupeshkumar
import { agentService } from './agent.service';
import { streamService } from './stream.service';
import { policyService } from './policy.service';
import { arbitrum-sepoliaService } from './arbitrum-sepolia.service';
import { transactionService } from './transaction.service';
import { Keypair } from '@arbitrum-sepolia/web3.js';

export const workflowService = {
  /**
   * Execute a multi-step financial workflow
   * Actions: 'deploy_agent' | 'start_stream' | 'set_policy' | 'payment'
   */
  async executeWorkflow(steps: any[]) {
    const results = [];

    for (const step of steps) {
      console.log(`--- Executing Workflow Step: ${step.type} ---`);
      
      try {
        // --- SECURITY VALIDATION ---
        // Check if the action violates any neural guardrails/policies
        const validation = await policyService.validateAction(
          step.type === 'payment' ? 'spending_limit' : step.type,
          step.data.amount || step.data.budget || 0,
          step.data.agentId
        );

        if (!validation.allowed) {
          results.push({ 
            step: step.type, 
            success: false, 
            error: `Security Block: ${validation.reason}` 
          });
          continue; // Skip this step but continue with others if possible
        }

        let result;
        switch (step.type) {
          case 'deploy_agent': {
            const agentKeypair = Keypair.generate();
            const walletAddress = agentKeypair.publicKey.toBase58();
            
            result = await agentService.createAgent({
              name: step.data.name,
              role: step.data.role,
              budget: parseFloat(step.data.budget),
            });
            
            // Fund the agent
            const funding = Math.min(parseFloat(step.data.budget) * 0.05, 10);
            try {
              await arbitrum-sepoliaService.executePayment(walletAddress, funding);
              await transactionService.createTransaction({
                agentId: result.id,
                amount: funding,
                type: 'deposit',
                description: 'Initial funding from Treasury',
                status: 'completed'
              });
            } catch (fundErr) {
              console.warn('Initial funding failed:', fundErr);
            }
            break;
          }
          case 'start_stream':
            result = await streamService.createStream(step.data);
            break;
          case 'set_policy':
            result = await policyService.createPolicy(step.data);
            break;
          case 'payment':
            // Logic for a single on-chain payment
            const signature = await arbitrum-sepoliaService.executePayment(step.data.recipient, step.data.amount);
            result = await transactionService.createTransaction({
              amount: step.data.amount,
              type: 'payment',
              description: step.data.description || 'Autonomous payment',
              txHash: signature,
              status: 'completed'
            });
            break;
          case 'agent_sync':
            // Logic to trigger an autonomous work cycle for an agent
            // This is primarily handled in the /api/agents/sync route but added here for orchestration
            result = { status: 'sync_initiated', agentId: step.data.agentId };
            break;
          default:
            throw new Error(`Unknown step type: ${step.type}`);
        }
        results.push({ step: step.type, success: true, data: result });
      } catch (error) {
        console.error(`Step ${step.type} failed:`, error);
        results.push({ step: step.type, success: false, error: (error as Error).message });
      }
    }

    return results;
  }
};
