// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta — Wallet route handlers (extracted from api.ts)

import { Router } from 'express';
import { JsonRpcProvider, formatUnits } from 'ethers';
import { WalletService } from '../services/wallet.service.js';
import { WdkDeepIntegrationService } from '../services/wdk-deep-integration.service.js';
import type { ChainId } from '../types/index.js';
import { logger } from '../utils/logger.js';

// WDK type imports for wallet management via Tether Wallet Development Kit
import type WDK from '@tetherto/wdk';
import type WalletManagerEvm from '@tetherto/wdk-wallet-evm';
import type WalletManagerTon from '@tetherto/wdk-wallet-ton';
import type WalletManagerTron from '@tetherto/wdk-wallet-tron';
// Wallet routes query WDK getBalance(), getTokenBalance(), and account.getAddress()
export type _WdkRefs = WDK | WalletManagerEvm | WalletManagerTon | WalletManagerTron; // eslint-disable-line @typescript-eslint/no-unused-vars

/**
 * Register wallet-related routes onto the given router.
 * Handles: addresses, balances, receive info, seed (masked), HD wallets, accounts.
 */
export function registerWalletRoutes(
  router: Router,
  wallet: WalletService,
): void {

  /**
   * @openapi
   * /wallet/addresses:
   *   get:
   *     tags: [Wallet]
   *     summary: Get all wallet addresses
   *     description: Returns wallet addresses for every registered blockchain (Ethereum Sepolia, TON Testnet, Tron Nile, Solana Devnet, BTC Testnet).
   *     responses:
   *       200:
   *         description: Addresses keyed by chain ID
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 addresses:
   *                   type: object
   *                   additionalProperties:
   *                     type: string
   *                   example:
   *                     ethereum-sepolia: "0x1234...abcd"
   *                     ton-testnet: "EQ..."
   *       500:
   *         description: Failed to fetch wallet addresses
   */
  router.get('/wallet/addresses', async (_req, res) => {
    try {
      const addresses = await wallet.getAllAddresses();
      res.json({ addresses });
    } catch (err) {
      logger.error('Failed to get addresses', { error: String(err) });
      res.status(500).json({ error: 'Failed to fetch wallet addresses' });
    }
  });

  /** GET /api/wallet/balances — Get all wallet balances */
  router.get('/wallet/balances', async (_req, res) => {
    try {
      const balances = await wallet.getAllBalances();
      res.json({ balances });
    } catch (err) {
      logger.error('Failed to get balances', { error: String(err) });
      res.status(500).json({ error: 'Failed to fetch balances' });
    }
  });

  /** GET /api/wallet/receive — Get wallet addresses formatted for receiving with QR code URLs */
  router.get('/wallet/receive', async (_req, res) => {
    try {
      const addresses = await wallet.getAllAddresses();
      const chains = wallet.getRegisteredChains();
      const wallets = chains
        .filter((chainId) => addresses[chainId])
        .map((chainId) => {
          const config = wallet.getChainConfig(chainId);
          const address = addresses[chainId];
          const isEth = chainId.startsWith('ethereum');
          const explorerBase = isEth
            ? 'https://sepolia.etherscan.io/address/'
            : 'https://testnet.tonviewer.com/';
          return {
            chainId,
            chainName: config.name,
            address,
            qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${encodeURIComponent(address)}`,
            explorerUrl: `${explorerBase}${address}`,
            nativeCurrency: config.nativeCurrency,
          };
        });
      res.json({ wallets });
    } catch (err) {
      logger.error('Failed to get receive info', { error: String(err) });
      res.status(500).json({ error: 'Failed to fetch receive info' });
    }
  });

  /** GET /api/wallet/seed — Disabled for security */
  router.get('/wallet/seed', (_req, res) => {
    res.status(403).json({ error: 'Seed phrase access disabled for security.' });
  });

  /** GET /api/wallets — List multiple derived wallets for a chain */
  router.get('/wallets', async (req, res) => {
    try {
      const chain = (req.query.chain as string) || 'ethereum-sepolia';
      const count = Math.min(Math.max(parseInt(req.query.count as string, 10) || 5, 1), 20);
      const wallets = await wallet.listWallets(chain as ChainId, count);
      res.json({ wallets, activeIndex: wallet.getActiveWalletIndex() });
    } catch (err) {
      logger.error('Failed to list wallets', { error: String(err) });
      res.status(500).json({ error: 'Failed to list derived wallets' });
    }
  });

  /** GET /api/wallets/:index — Get wallet at a specific derivation index */
  router.get('/wallets/:index', async (req, res) => {
    try {
      const index = parseInt(req.params.index, 10);
      if (isNaN(index) || index < 0) {
        res.status(400).json({ error: 'Index must be a non-negative integer' });
        return;
      }
      const chain = (req.query.chain as string) || 'ethereum-sepolia';
      const derived = await wallet.getWalletByIndex(chain as ChainId, index);
      res.json({ wallet: derived });
    } catch (err) {
      logger.error('Failed to get wallet by index', { error: String(err) });
      res.status(500).json({ error: 'Failed to get wallet at index' });
    }
  });

  /** POST /api/wallets/active — Set the active wallet index for sending */
  router.post('/wallets/active', (req, res) => {
    try {
      const { index } = req.body as { index: number };
      if (typeof index !== 'number' || index < 0 || !Number.isInteger(index)) {
        res.status(400).json({ error: 'index must be a non-negative integer' });
        return;
      }
      wallet.setActiveWalletIndex(index);
      res.json({ activeIndex: index });
    } catch (err) {
      logger.error('Failed to set active wallet', { error: String(err) });
      res.status(500).json({ error: 'Failed to set active wallet index' });
    }
  });

  /** GET /api/wallet/accounts — List derived HD accounts */
  router.get('/wallet/accounts', async (req, res) => {
    try {
      const chain = (req.query.chain as string) || 'ethereum-sepolia';
      const count = parseInt(req.query.count as string) || 5;
      const accounts = await wallet.listDerivedAccounts(chain as ChainId, count);
      const activeIndex = wallet.getActiveAccountIndex();
      res.json({ accounts, activeIndex, chain });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  /** POST /api/wallet/accounts/active — Set active HD account index */
  router.post('/wallet/accounts/active', (req, res) => {
    try {
      const { index } = req.body as { index: number };
      if (typeof index !== 'number') {
        res.status(400).json({ error: 'index (number) is required' });
        return;
      }
      wallet.setActiveAccountIndex(index);
      res.json({ activeIndex: index, message: `Switched to account #${index}` });
    } catch (err) {
      res.status(400).json({ error: String(err) });
    }
  });

  // ── Gas & Fee Routes ──────────────────────────────────────────────

  /** GET /api/gas/speeds — Get gas speed options (slow/normal/fast) with estimated fees */
  router.get('/gas/speeds', async (_req, res) => {
    try {
      const chainIds = wallet.getRegisteredChains();
      const speeds: Array<{
        chainId: string;
        chainName: string;
        speeds: Array<{
          level: 'slow' | 'normal' | 'fast';
          label: string;
          gasPriceGwei: string;
          estimatedFee: string;
          estimatedTime: string;
        }>;
      }> = [];

      for (const chainId of chainIds) {
        const config = wallet.getChainConfig(chainId);

        if (config.blockchain === 'ethereum') {
          try {
            const rpcUrl = config.rpcUrl
              ?? process.env.ETH_SEPOLIA_RPC
              ?? 'https://ethereum-sepolia-rpc.publicnode.com';
            const provider = new JsonRpcProvider(rpcUrl);
            const feeData = await provider.getFeeData();
            const baseFee = feeData.gasPrice ?? 0n;
            const baseGwei = parseFloat(formatUnits(baseFee, 'gwei'));

            const gasUnits = 21000n;

            const slowPrice = baseFee * 80n / 100n;
            const normalPrice = baseFee;
            const fastPrice = baseFee * 150n / 100n;

            const slowFee = slowPrice * gasUnits;
            const normalFee = normalPrice * gasUnits;
            const fastFee = fastPrice * gasUnits;

            speeds.push({
              chainId,
              chainName: config.name,
              speeds: [
                {
                  level: 'slow',
                  label: 'Slow (save fees)',
                  gasPriceGwei: (baseGwei * 0.8).toFixed(2),
                  estimatedFee: `${parseFloat(formatUnits(slowFee, 'ether')).toFixed(6)} ETH`,
                  estimatedTime: '~5-10 min',
                },
                {
                  level: 'normal',
                  label: 'Normal',
                  gasPriceGwei: baseGwei.toFixed(2),
                  estimatedFee: `${parseFloat(formatUnits(normalFee, 'ether')).toFixed(6)} ETH`,
                  estimatedTime: '~1-3 min',
                },
                {
                  level: 'fast',
                  label: 'Fast (priority)',
                  gasPriceGwei: (baseGwei * 1.5).toFixed(2),
                  estimatedFee: `${parseFloat(formatUnits(fastFee, 'ether')).toFixed(6)} ETH`,
                  estimatedTime: '~15-30 sec',
                },
              ],
            });
          } catch (err) {
            logger.warn('Failed to fetch gas speeds for EVM chain', { chainId, error: String(err) });
          }
        } else {
          // TON: fixed/low gas, speeds don't vary much
          speeds.push({
            chainId,
            chainName: config.name,
            speeds: [
              { level: 'slow', label: 'Slow', gasPriceGwei: '0.005', estimatedFee: '~0.005 TON', estimatedTime: '~30 sec' },
              { level: 'normal', label: 'Normal', gasPriceGwei: '0.01', estimatedFee: '~0.01 TON', estimatedTime: '~15 sec' },
              { level: 'fast', label: 'Fast', gasPriceGwei: '0.02', estimatedFee: '~0.02 TON', estimatedTime: '~5 sec' },
            ],
          });
        }
      }

      res.json({ speeds });
    } catch (err) {
      logger.error('Gas speed fetch failed', { error: String(err) });
      res.status(500).json({ error: 'Failed to fetch gas speeds' });
    }
  });

  /** GET /api/fees/compare — Compare fees across all chains for a given transfer */
  router.get('/fees/compare', async (req, res) => {
    try {
      const { recipient, amount } = req.query as { recipient?: string; amount?: string };
      if (!recipient || !amount) {
        res.status(400).json({ error: 'recipient and amount query params are required' });
        return;
      }

      const comparison = await wallet.estimateAllFees(recipient, amount);
      const cheapest = comparison[0];
      const mostExpensive = comparison[comparison.length - 1];

      res.json({
        comparison,
        recommendation: cheapest
          ? {
              cheapestChain: cheapest.chainId,
              cheapestChainName: cheapest.chainName,
              cheapestFeeUsd: cheapest.estimatedFeeUsd,
              potentialSavings: cheapest.savingsVsHighest,
            }
          : null,
        summary:
          cheapest && mostExpensive && comparison.length > 1
            ? `Use ${cheapest.chainName} to save ${cheapest.savingsVsHighest} vs ${mostExpensive.chainName}`
            : 'Only one chain available',
      });
    } catch (err) {
      logger.error('Fee comparison failed', { error: String(err) });
      res.status(500).json({ error: 'Failed to compare fees across chains' });
    }
  });

  /** GET /api/chains — Get supported chains info */
  router.get('/chains', (_req, res) => {
    const chains = wallet.getRegisteredChains().map((id) => wallet.getChainConfig(id));
    res.json({ chains });
  });

  /** GET /api/gas — Real-time gas prices across all chains */
  router.get('/gas', async (_req, res) => {
    try {
      const chainIds = wallet.getRegisteredChains();
      const chains = await Promise.all(
        chainIds.map(async (chainId) => {
          const config = wallet.getChainConfig(chainId);

          if (config.blockchain === 'ethereum') {
            try {
              const rpcUrl = config.rpcUrl
                ?? process.env.ETH_SEPOLIA_RPC
                ?? 'https://ethereum-sepolia-rpc.publicnode.com';
              const provider = new JsonRpcProvider(rpcUrl);
              const feeData = await provider.getFeeData();
              const gasPriceWei = feeData.gasPrice ?? 0n;
              const gasPriceGwei = parseFloat(formatUnits(gasPriceWei, 'gwei'));

              let status: 'low' | 'medium' | 'high' = 'medium';
              if (gasPriceGwei < 10) status = 'low';
              else if (gasPriceGwei >= 30) status = 'high';

              return {
                chainId,
                chainName: config.name,
                gasPrice: gasPriceWei.toString(),
                gasPriceGwei: gasPriceGwei.toFixed(2),
                status,
                lastUpdated: new Date().toISOString(),
              };
            } catch (err) {
              logger.warn('Failed to fetch EVM gas price', { chainId, error: String(err) });
              return {
                chainId,
                chainName: config.name,
                gasPrice: '0',
                gasPriceGwei: '0.00',
                status: 'medium' as const,
                lastUpdated: new Date().toISOString(),
              };
            }
          }

          return {
            chainId,
            chainName: config.name,
            gasPrice: '10000000',
            gasPriceGwei: '0.01',
            status: 'low' as const,
            lastUpdated: new Date().toISOString(),
          };
        }),
      );

      res.json({ chains });
    } catch (err) {
      logger.error('Gas price fetch failed', { error: String(err) });
      res.status(500).json({ error: 'Failed to fetch gas prices' });
    }
  });

  /** GET /api/prices — Crypto prices via Bitfinex public API with static fallback */
  const priceCache = { prices: { ETH: 2500, TON: 2.50, USDT: 1.00 }, fetchedAt: '', isLive: false };
  router.get('/prices', async (_req, res) => {
    const cacheAge = priceCache.fetchedAt ? Date.now() - new Date(priceCache.fetchedAt).getTime() : Infinity;
    if (cacheAge > 60_000) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const signal = controller.signal;

        const [ethResp, tonResp] = await Promise.all([
          fetch('https://api-pub.bitfinex.com/v2/ticker/tETHUSD', { signal }),
          fetch('https://api-pub.bitfinex.com/v2/ticker/tTONUSD', { signal }),
        ]);
        clearTimeout(timeout);

        if (ethResp.ok && tonResp.ok) {
          const ethData = await ethResp.json() as number[];
          const tonData = await tonResp.json() as number[];
          priceCache.prices = {
            ETH: ethData[6] ?? 2500,
            TON: tonData[6] ?? 2.50,
            USDT: 1.00,
          };
          priceCache.fetchedAt = new Date().toISOString();
          priceCache.isLive = true;

          WalletService.updatePrices(priceCache.prices.ETH, priceCache.prices.TON);
        }
      } catch {
        if (!priceCache.fetchedAt) priceCache.fetchedAt = new Date().toISOString();
        priceCache.isLive = false;
      }
    }
    res.json({
      prices: priceCache.prices,
      lastUpdated: priceCache.fetchedAt || new Date().toISOString(),
      isLive: priceCache.isLive,
      source: priceCache.isLive ? 'Bitfinex API' : 'Static fallback (Bitfinex unavailable)',
    });
  });

  /** GET /api/wallet/signer-info — Get all chain addresses for audit */
  router.get('/wallet/signer-info', async (_req, res) => {
    try {
      const signerInfo = await wallet.getSignerInfo();
      res.json({ signers: signerInfo });
    } catch (err) {
      logger.error('Failed to get signer info', { error: String(err) });
      res.status(500).json({ error: 'Failed to fetch signer info' });
    }
  });

  /** POST /api/wallet/verify-signer — Verify signer alignment for a chain */
  router.post('/wallet/verify-signer', async (req, res) => {
    try {
      const { expectedAddress, chainId } = req.body ?? {};
      if (!expectedAddress || !chainId) {
        res.status(400).json({ error: 'Missing required fields: expectedAddress, chainId' });
        return;
      }
      const result = await wallet.verifySignerAlignment(expectedAddress, chainId);
      res.json(result);
    } catch (err) {
      logger.error('Signer alignment verification failed', { error: String(err) });
      res.status(500).json({ error: 'Signer alignment verification failed' });
    }
  });

  // ── Gasless (ERC-4337 / TON Gasless) Verification ─────────────────

  /** GET /api/wallet/gasless-status — Prove gasless wallet registration and readiness */
  router.get('/wallet/gasless-status', async (_req, res) => {
    try {
      const status = wallet.getGaslessStatus();
      const chains = wallet.getRegisteredChains();

      // Try to get ERC-4337 wallet address if registered
      let erc4337Address: string | null = null;
      if (status.evmErc4337.available) {
        try {
          erc4337Address = await wallet.getAddress('ethereum-sepolia-gasless');
        } catch { /* address not available yet */ }
      }

      // Try to get TON gasless wallet address if registered
      let tonGaslessAddress: string | null = null;
      if (status.tonGasless.available) {
        try {
          tonGaslessAddress = await wallet.getAddress('ton-testnet-gasless');
        } catch { /* address not available yet */ }
      }

      res.json({
        erc4337: {
          registered: status.evmErc4337.available,
          walletAddress: erc4337Address,
          bundlerUrl: status.evmErc4337.bundlerUrl,
          paymasterUrl: status.evmErc4337.paymasterUrl,
          status: status.evmErc4337.available ? 'active' : (chains.includes('ethereum-sepolia') ? 'fallback' : 'unavailable'),
          explanation: status.evmErc4337.available
            ? 'ERC-4337 smart account via Pimlico bundler — users need NO ETH for gas'
            : `ERC-4337 unavailable: ${status.evmErc4337.reason ?? 'bundler/paymaster not configured'}. Falling back to regular EVM transactions.`,
        },
        tonGasless: {
          registered: status.tonGasless.available,
          walletAddress: tonGaslessAddress,
          status: status.tonGasless.available ? 'active' : (chains.includes('ton-testnet') ? 'fallback' : 'unavailable'),
          explanation: status.tonGasless.available
            ? 'TON gasless via sponsored paymaster — users need NO TON for gas'
            : `TON gasless unavailable: ${status.tonGasless.reason ?? 'gasless API not configured'}. Falling back to regular TON transactions.`,
        },
        supportedChains: chains.filter(c => c.includes('gasless') || c.includes('4337')),
      });
    } catch (err) {
      logger.error('Gasless status check failed', { error: String(err) });
      res.status(500).json({ error: 'Failed to fetch gasless status' });
    }
  });

  /** POST /api/wallet/gasless-test — Attempt a 0-value gasless transaction to verify it works */
  router.post('/wallet/gasless-test', async (_req, res) => {
    try {
      const status = wallet.getGaslessStatus();

      if (!status.evmErc4337.available && !status.tonGasless.available) {
        res.json({
          success: false,
          error: 'No gasless wallets are registered. Set ERC4337_BUNDLER_URL and ERC4337_PAYMASTER_URL env vars.',
          erc4337Reason: status.evmErc4337.reason,
          tonReason: status.tonGasless.reason,
        });
        return;
      }

      // Try ERC-4337 gasless 0-value self-transfer
      if (status.evmErc4337.available) {
        try {
          const selfAddress = await wallet.getAddress('ethereum-sepolia-gasless');
          const result = await wallet.sendGaslessTransaction(selfAddress, '0', 'native');
          res.json({
            success: true,
            method: 'ERC-4337',
            txHash: result.hash,
            fee: result.fee,
            gasless: result.gasless,
            chainId: result.chainId,
            selfAddress,
            explorerUrl: `https://sepolia.etherscan.io/tx/${result.hash}`,
            message: 'Gasless transaction succeeded — 0 ETH spent on gas via Pimlico paymaster',
          });
          return;
        } catch (err) {
          logger.warn('ERC-4337 gasless test failed, trying TON', { error: String(err) });
          // Fall through to TON
        }
      }

      // Try TON gasless 0-value self-transfer
      if (status.tonGasless.available) {
        try {
          const selfAddress = await wallet.getAddress('ton-testnet-gasless');
          const result = await wallet.sendGaslessTransaction(selfAddress, '0', 'native');
          res.json({
            success: true,
            method: 'TON-Gasless',
            txHash: result.hash,
            fee: result.fee,
            gasless: result.gasless,
            chainId: result.chainId,
            selfAddress,
            message: 'TON gasless transaction succeeded — 0 TON spent on gas',
          });
          return;
        } catch (err) {
          logger.warn('TON gasless test also failed', { error: String(err) });
          res.json({
            success: false,
            error: `Gasless test transaction failed: ${String(err)}`,
            note: 'Gasless wallets are registered but the 0-value test transaction could not complete. This may be due to bundler/paymaster rate limits or testnet issues.',
          });
          return;
        }
      }

      res.json({ success: false, error: 'Unexpected state — no gasless method available' });
    } catch (err) {
      logger.error('Gasless test failed', { error: String(err) });
      res.status(500).json({ error: 'Gasless test failed', detail: String(err) });
    }
  });

  // ── WDK Deep Integration Check ─────────────────────────────────
  /**
   * @openapi
   * /wdk/integration-check:
   *   get:
   *     tags: [WDK]
   *     summary: Run deep integration check across all 12 WDK packages
   *     description: |
   *       Exercises every WDK package we depend on — calling real constructors,
   *       wallet registration, account derivation, protocol registration, and
   *       MCP tool enumeration. Returns a detailed report proving per-package usage.
   *     responses:
   *       200:
   *         description: Integration report with per-package results
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 timestamp: { type: string }
   *                 total_packages: { type: number }
   *                 passed: { type: number }
   *                 failed: { type: number }
   *                 results:
   *                   type: array
   *                   items:
   *                     type: object
   *                     properties:
   *                       package: { type: string }
   *                       methods_tested: { type: array, items: { type: string } }
   *                       success: { type: boolean }
   *                       error: { type: string }
   */
  router.get('/wdk/integration-check', async (_req, res) => {
    try {
      logger.info('Running WDK deep integration check');
      const integrationService = new WdkDeepIntegrationService();
      const report = await integrationService.runAllIntegrationChecks();
      res.json(report);
    } catch (err) {
      logger.error('WDK integration check failed', { error: String(err) });
      res.status(500).json({ error: 'Integration check failed', detail: String(err) });
    }
  });
}
