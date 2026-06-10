import { v4 as uuidv4 } from 'uuid';
import { JsonRpcProvider, formatUnits } from 'ethers';
import { logger } from '../utils/logger.js';
import type { TipCondition, ConditionType } from '../types/index.js';
import type { WalletService } from './wallet.service.js';

/**
 * ConditionsService — manages smart conditional tips.
 *
 * The agent evaluates conditions every scheduler cycle and automatically
 * triggers tips when conditions are met, demonstrating true autonomy.
 */
export class ConditionsService {
  private conditions: TipCondition[] = [];
  private wallet: WalletService;

  constructor(wallet: WalletService) {
    this.wallet = wallet;
  }

  /** Add a new condition */
  addCondition(input: {
    type: ConditionType;
    params: TipCondition['params'];
    tip: TipCondition['tip'];
  }): TipCondition {
    const condition: TipCondition = {
      id: uuidv4(),
      type: input.type,
      params: input.params,
      tip: input.tip,
      status: 'active',
      createdAt: new Date().toISOString(),
    };

    this.conditions.push(condition);
    logger.info('Condition created', { id: condition.id, type: condition.type });
    return condition;
  }

  /** Get all conditions */
  getConditions(): TipCondition[] {
    return [...this.conditions];
  }

  /** Cancel a condition by ID */
  cancelCondition(id: string): boolean {
    const condition = this.conditions.find((c) => c.id === id);
    if (!condition || condition.status !== 'active') return false;
    condition.status = 'cancelled';
    logger.info('Condition cancelled', { id });
    return true;
  }

  /**
   * Check all active conditions and return those that are now triggered.
   * Triggered conditions have their status updated to 'triggered'.
   */
  async checkConditions(): Promise<TipCondition[]> {
    const active = this.conditions.filter((c) => c.status === 'active');
    if (active.length === 0) return [];

    const triggered: TipCondition[] = [];

    for (const condition of active) {
      try {
        const met = await this.evaluateCondition(condition);
        if (met) {
          condition.status = 'triggered';
          condition.triggeredAt = new Date().toISOString();
          triggered.push(condition);
          logger.info('Condition triggered', { id: condition.id, type: condition.type });
        }
      } catch (err) {
        logger.warn('Condition evaluation failed', {
          id: condition.id,
          type: condition.type,
          error: String(err),
        });
      }
    }

    return triggered;
  }

  /** Evaluate a single condition */
  private async evaluateCondition(condition: TipCondition): Promise<boolean> {
    switch (condition.type) {
      case 'gas_below':
        return this.checkGasBelow(condition);
      case 'balance_above':
        return this.checkBalanceAbove(condition);
      case 'time_of_day':
        return this.checkTimeOfDay(condition);
      // price_change removed: requires paid price feed API (zero budget constraint)
      default:
        return false;
    }
  }

  /** Check if current gas price is below the threshold (in gwei) */
  private async checkGasBelow(condition: TipCondition): Promise<boolean> {
    const threshold = parseFloat(condition.params.threshold ?? '0');
    if (threshold <= 0) return false;

    try {
      const rpcUrl = process.env.ETH_SEPOLIA_RPC ?? 'https://ethereum-sepolia-rpc.publicnode.com';
      const provider = new JsonRpcProvider(rpcUrl);
      const feeData = await provider.getFeeData();
      const gasPriceWei = feeData.gasPrice ?? 0n;
      const gasPriceGwei = parseFloat(formatUnits(gasPriceWei, 'gwei'));

      logger.debug('Gas check', { gasPriceGwei, threshold });
      return gasPriceGwei < threshold;
    } catch (err) {
      logger.warn('Gas price check failed', { error: String(err) });
      return false;
    }
  }

  /** Check if wallet balance is above the threshold */
  private async checkBalanceAbove(condition: TipCondition): Promise<boolean> {
    const threshold = parseFloat(condition.params.threshold ?? '0');
    if (threshold <= 0) return false;

    const currency = (condition.params.currency ?? 'ETH').toUpperCase();

    try {
      const balances = await this.wallet.getAllBalances();

      for (const bal of balances) {
        if (currency === 'ETH' && bal.chainId === 'ethereum-sepolia') {
          return parseFloat(bal.nativeBalance) > threshold;
        }
        if (currency === 'TON' && bal.chainId === 'ton-testnet') {
          return parseFloat(bal.nativeBalance) > threshold;
        }
        if (currency === 'USDT') {
          if (parseFloat(bal.usdtBalance) > threshold) return true;
        }
      }

      return false;
    } catch (err) {
      logger.warn('Balance check failed', { error: String(err) });
      return false;
    }
  }

  /** Check if current time is within the specified time window */
  private checkTimeOfDay(condition: TipCondition): boolean {
    const { timeStart, timeEnd } = condition.params;
    if (!timeStart || !timeEnd) return false;

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const [startH, startM] = timeStart.split(':').map(Number);
    const [endH, endM] = timeEnd.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    if (startMinutes <= endMinutes) {
      // Normal range (e.g., 09:00 to 17:00)
      return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
    } else {
      // Overnight range (e.g., 22:00 to 06:00)
      return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
    }
  }
}
