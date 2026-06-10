// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta SDK — WDK Protocol Plugin Usage Example
//
// Demonstrates registering AeroFyta as a native WDK protocol,
// the same way Tether registers Aave, Velora, or any other
// protocol in their ecosystem.
//
// Run: npx tsx agent/src/sdk/examples/wdk-plugin-usage.ts

/* eslint-disable no-console */

import { AeroFytaProtocol } from '../wdk-plugin.js';
import { UniversalAdapter } from '../adapters/index.js';

async function main() {
  console.log('--- AeroFyta WDK Protocol Plugin ---\n');

  // ── 1. Simulate a WDK account ─────────────────────────────────
  //
  // In production, this comes from:
  //   const wdk = new WDK();
  //   const account = await wdk.getAccount('ethereum', 0);
  //
  // We simulate it here for demonstration purposes.
  const mockAccount = {
    seed: 'test test test test test test test test test test test junk',
    getAddress: () => '0xABCDEF1234567890abcdef1234567890ABCDEF12',
    getSeed: () => 'test test test test test test test test test test test junk',
  };

  // ── 2. Register AeroFyta as a WDK protocol ────────────────────
  //
  // This is the pattern Tether uses for all protocols:
  //   account.registerProtocol('aerofyta', AeroFytaProtocol, config)
  //
  const aerofyta = await AeroFytaProtocol.create(mockAccount, {
    llmProvider: 'rule-based',
    autonomousMode: false,
    safetyProfile: 'balanced',
    explorationRate: 0.1,
  });

  console.log(`Protocol: ${AeroFytaProtocol.protocolId} v${AeroFytaProtocol.version}`);

  // ── 3. Subscribe to events ────────────────────────────────────
  aerofyta.hooks.onTip((tip) => {
    console.log(`[Event] Tip sent: ${tip.amount} to ${tip.recipient} on ${tip.chain}`);
  });
  aerofyta.hooks.onBlock((block) => {
    console.log(`[Event] Tip blocked: ${block.reason} (policy: ${block.policy})`);
  });

  // ── 4. Check agent status ─────────────────────────────────────
  const status = await aerofyta.getAgentStatus();
  console.log('Agent status:', JSON.stringify(status, null, 2));

  // ── 5. Get financial pulse ────────────────────────────────────
  const pulse = await aerofyta.getFinancialPulse();
  console.log('Financial pulse:', JSON.stringify(pulse, null, 2));

  // ── 6. Evaluate a creator ─────────────────────────────────────
  const evaluation = await aerofyta.evaluateCreator({
    address: '0x1234567890abcdef1234567890abcdef12345678',
    platform: 'rumble',
  });
  console.log('Creator evaluation:', JSON.stringify(evaluation, null, 2));

  // ── 7. Get recommendations ────────────────────────────────────
  const recs = await aerofyta.getRecommendations({ count: 3 });
  console.log('Recommendations:', JSON.stringify(recs, null, 2));

  // ── 8. Use chain adapters ─────────────────────────────────────
  console.log('\nSupported chains:', UniversalAdapter.getSupportedChains().join(', '));

  const evmWallet = UniversalAdapter.fromWDKAccount(mockAccount, 'ethereum-sepolia');
  console.log(`EVM wallet: ${evmWallet.getAddress()} on ${evmWallet.chainName}`);

  const tonWallet = UniversalAdapter.fromWDKAccount(mockAccount, 'ton-testnet');
  console.log(`TON wallet: ${tonWallet.getAddress()} on ${tonWallet.chainName}`);

  // ── 9. Access underlying agent ────────────────────────────────
  const agent = aerofyta.getAgent();
  console.log('\nDirect agent status:', agent.getStatus());

  console.log('\n--- WDK Protocol Plugin working! ---');
}

main().catch(console.error);
