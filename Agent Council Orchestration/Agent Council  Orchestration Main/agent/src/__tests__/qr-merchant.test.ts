/**
 * QRMerchantService — merchant registration and QR payment generation.
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { QRMerchantService } from '../services/qr-merchant.service.js';

describe('QRMerchantService', () => {
  let service: QRMerchantService;
  let merchantId: string;

  before(() => {
    service = new QRMerchantService();
    const merchant = service.registerMerchant({
      name: 'Test Shop',
      walletAddress: '0xShopWallet0000000000000000000000000001',
      chainId: 'ethereum-sepolia',
    });
    merchantId = merchant.id;
  });

  it('registerMerchant creates a merchant profile', () => {
    const m = service.getMerchant(merchantId);
    assert.ok(m);
    assert.equal(m!.name, 'Test Shop');
    assert.equal(m!.transactionCount, 0);
  });

  it('listMerchants returns registered merchants', () => {
    const merchants = service.listMerchants();
    assert.ok(merchants.length >= 1);
  });

  it('generatePaymentQR creates a QR payment request', () => {
    const result = service.generatePaymentQR({
      merchantId,
      amount: '0.5',
      token: 'USDT',
    });
    assert.ok(!('error' in result));
    if (!('error' in result)) {
      assert.ok(result.id);
      assert.equal(result.amount, '0.5');
      assert.ok(result.qrData.includes('aerofyta://'));
      assert.ok(result.paymentUri);
      assert.equal(result.status, 'pending');
    }
  });

  it('generatePaymentQR rejects unaccepted token', () => {
    const result = service.generatePaymentQR({
      merchantId,
      amount: '1',
      token: 'DOGE',
    });
    assert.ok('error' in result);
  });

  it('cancelPayment cancels a pending payment', () => {
    const qr = service.generatePaymentQR({ merchantId, amount: '1' });
    assert.ok(!('error' in qr));
    if (!('error' in qr)) {
      const cancelled = service.cancelPayment(qr.id);
      assert.ok(!('error' in cancelled));
      if (!('error' in cancelled)) {
        assert.equal(cancelled.status, 'cancelled');
      }
    }
  });

  it('getStats returns payment statistics', () => {
    const stats = service.getStats();
    assert.equal(typeof stats.totalMerchants, 'number');
    assert.equal(typeof stats.totalPayments, 'number');
    assert.equal(typeof stats.totalVolume, 'number');
  });
});
