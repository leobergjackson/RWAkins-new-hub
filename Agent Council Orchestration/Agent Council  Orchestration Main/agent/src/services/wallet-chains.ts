// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta — Wallet Chain Configurations (extracted from wallet.service.ts)

import type { ChainId, ChainConfig } from '../types/index.js';

/** USDT contract addresses */
export const USDT_CONTRACTS: Record<string, string> = {
  'ethereum-sepolia': '0x7169D38820dfd117C3FA1f22a697dBA58d90BA06', // Sepolia USDT
  'polygon-mainnet': '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', // Polygon Mainnet USDT
};

/** USDC contract addresses — Colibrí settles USD→MXN remittances in USDC on Ethereum L2s.
 *  These are the canonical native-USDC deployments on Arbitrum One and Base mainnet. */
export const USDC_CONTRACTS: Record<string, string> = {
  'arbitrum': '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', // Arbitrum One native USDC
  'base': '0x833589fCD6eDb6E08f4c7C32D4f71b1566dA8eEF',     // Base mainnet native USDC
};

/** USAT (USA₮) contract addresses.
 *  USAT is Tether's US dollar-backed stablecoin — a Rumble-supported tipping token.
 *  Same WDK transfer() flow as USDT; the contract address is the only difference.
 *  On testnet, USAT uses a separate ERC-20 deployment so the agent can differentiate
 *  token balances and transfers. Override via USAT_CONTRACT env var. */
export const USAT_CONTRACTS: Record<string, string> = {
  'ethereum-sepolia': process.env.USAT_CONTRACT ?? '0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0',
};

/** XAU₮ (Tether Gold) contract addresses.
 *  XAU₮ is Tether's gold-backed token — each token represents one troy ounce of gold.
 *  Same WDK transfer() flow as USDT; the contract address is the only difference.
 *  On testnet, XAUT uses a separate ERC-20 deployment so the agent can differentiate
 *  token balances and transfers. Override via XAUT_CONTRACT env var. */
export const XAUT_CONTRACTS: Record<string, string> = {
  'ethereum-sepolia': process.env.XAUT_CONTRACT ?? '0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9',
};

/** Chain configurations */
export const CHAIN_CONFIGS: Record<ChainId, ChainConfig> = {
  'ethereum-sepolia': {
    id: 'ethereum-sepolia',
    name: 'Ethereum Sepolia',
    blockchain: 'ethereum',
    isTestnet: true,
    nativeCurrency: 'ETH',
    explorerUrl: 'https://sepolia.etherscan.io',
    rpcUrl: process.env.ETH_SEPOLIA_RPC ?? 'https://ethereum-sepolia-rpc.publicnode.com',
  },
  'ton-testnet': {
    id: 'ton-testnet',
    name: 'TON Testnet',
    blockchain: 'ton',
    isTestnet: true,
    nativeCurrency: 'TON',
    explorerUrl: 'https://testnet.tonviewer.com',
  },
  'tron-nile': {
    id: 'tron-nile',
    name: 'Tron Nile',
    blockchain: 'tron',
    isTestnet: true,
    nativeCurrency: 'TRX',
    explorerUrl: 'https://nile.tronscan.org',
  },
  'ethereum-sepolia-gasless': {
    id: 'ethereum-sepolia-gasless',
    name: 'Ethereum Sepolia (Gasless)',
    blockchain: 'ethereum-erc4337',
    isTestnet: true,
    nativeCurrency: 'ETH',
    explorerUrl: 'https://sepolia.etherscan.io',
    rpcUrl: process.env.ETH_SEPOLIA_RPC ?? 'https://ethereum-sepolia-rpc.publicnode.com',
  },
  'ton-testnet-gasless': {
    id: 'ton-testnet-gasless',
    name: 'TON Testnet (Gasless)',
    blockchain: 'ton-gasless',
    isTestnet: true,
    nativeCurrency: 'TON',
    explorerUrl: 'https://testnet.tonviewer.com',
  },
  'bitcoin-testnet': {
    id: 'bitcoin-testnet',
    name: 'Bitcoin Testnet',
    blockchain: 'bitcoin',
    isTestnet: true,
    nativeCurrency: 'BTC',
    explorerUrl: 'https://mempool.space/testnet',
  },
  'solana-devnet': {
    id: 'solana-devnet',
    name: 'Solana Devnet',
    blockchain: 'solana',
    isTestnet: true,
    nativeCurrency: 'SOL',
    explorerUrl: 'https://explorer.solana.com',
    rpcUrl: 'https://api.devnet.solana.com',
  },
  'plasma': {
    id: 'plasma',
    name: 'Plasma (x402)',
    blockchain: 'plasma',
    isTestnet: true,
    nativeCurrency: 'ETH',
    explorerUrl: 'https://explorer.plasma.to',
    rpcUrl: process.env.PLASMA_RPC ?? 'https://rpc.plasma.to',
  },
  'stable': {
    id: 'stable',
    name: 'Stable (x402)',
    blockchain: 'stable',
    isTestnet: true,
    nativeCurrency: 'ETH',
    explorerUrl: 'https://explorer.stable.xyz',
    rpcUrl: process.env.STABLE_RPC ?? 'https://rpc.stable.xyz',
  },
  'polygon-mainnet': {
    id: 'polygon-mainnet',
    name: 'Polygon Mainnet',
    blockchain: 'ethereum',
    isTestnet: false,
    nativeCurrency: 'POL',
    explorerUrl: 'https://polygonscan.com',
    rpcUrl: process.env.POLYGON_RPC ?? 'https://polygon-bor-rpc.publicnode.com',
  },
};
