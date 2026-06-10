// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta — WDK Mock Layer for Unit Testing
//
// Lightweight mock that implements the WDK wallet interface so
// WDK-dependent services can be unit-tested without network access.

export class MockWalletService {
  private balances: Map<string, string> = new Map([
    ['ethereum-sepolia', '0.05'],
    ['ton-testnet', '5.0'],
    ['tron-nile', '100.0'],
  ]);
  private txCount = 0;
  private failNextTx = false;

  async getAddress(chainId: string): Promise<string> {
    const addresses: Record<string, string> = {
      'ethereum-sepolia': '0x' + 'a'.repeat(40),
      'ton-testnet': 'UQ' + 'B'.repeat(46),
      'tron-nile': 'T' + 'C'.repeat(33),
    };
    return addresses[chainId] || '0x' + '0'.repeat(40);
  }

  async getAllBalances() {
    return Array.from(this.balances.entries()).map(([chainId, balance]) => ({
      chainId,
      balance,
      symbol: chainId.includes('eth') ? 'ETH' : chainId.includes('ton') ? 'TON' : 'TRX',
      address: '0x...',
    }));
  }

  async getBalance(chainId: string): Promise<{ nativeBalance: string; usdtBalance: string }> {
    const bal = this.balances.get(chainId) ?? '0';
    return { nativeBalance: bal, usdtBalance: bal };
  }

  async sendTransaction(chainId: string, _to: string, amount: string): Promise<{ hash: string; fee: string }> {
    if (this.failNextTx) {
      this.failNextTx = false;
      throw new Error('Mock: transaction failed');
    }
    this.txCount++;
    const hash = '0x' + this.txCount.toString(16).padStart(64, '0');
    // Deduct from balance
    const current = parseFloat(this.balances.get(chainId) ?? '0');
    const amt = parseFloat(amount);
    if (amt > 0) {
      this.balances.set(chainId, Math.max(0, current - amt).toString());
    }
    return { hash, fee: '0.0001' };
  }

  getRegisteredChains(): string[] {
    return ['ethereum-sepolia', 'ton-testnet', 'tron-nile'];
  }

  async getAllAddresses(): Promise<Record<string, string>> {
    return {
      'ethereum-sepolia': '0x' + 'a'.repeat(40),
      'ton-testnet': 'UQ' + 'B'.repeat(46),
      'tron-nile': 'T' + 'C'.repeat(33),
    };
  }

  async estimateAllFees(): Promise<Array<{ chainId: string; fee: string }>> {
    return [
      { chainId: 'ethereum-sepolia', fee: '0.0001' },
      { chainId: 'ton-testnet', fee: '0.00005' },
      { chainId: 'tron-nile', fee: '0.00001' },
    ];
  }

  // ── Escrow HD vault support ──────────────────────────────
  async getWalletByIndex(_chainId: string, index: number): Promise<string> {
    return '0x' + 'vault'.padStart(4, '0') + index.toString(16).padStart(36, '0');
  }

  async sendTransactionFromIndex(chainId: string, _index: number, to: string, amount: string): Promise<{ hash: string; fee: string }> {
    return this.sendTransaction(chainId, to, amount);
  }

  // ── Test Helpers ──────────────────────────────────────────

  /** Set a specific balance for a chain */
  setBalance(chainId: string, amount: string): void {
    this.balances.set(chainId, amount);
  }

  /** Get the total number of transactions executed */
  getTxCount(): number {
    return this.txCount;
  }

  /** Reset all state */
  reset(): void {
    this.balances = new Map([
      ['ethereum-sepolia', '0.05'],
      ['ton-testnet', '5.0'],
      ['tron-nile', '100.0'],
    ]);
    this.txCount = 0;
    this.failNextTx = false;
  }

  /** Make the next sendTransaction call throw */
  setFailNextTx(): void {
    this.failNextTx = true;
  }
}
