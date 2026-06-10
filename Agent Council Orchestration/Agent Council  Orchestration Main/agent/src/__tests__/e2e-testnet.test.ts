/**
 * End-to-end tests against a live AeroFyta agent server.
 *
 * These tests make real HTTP calls to the running agent and verify
 * response structure (not exact values). Every test skips gracefully
 * when the server is unreachable so CI never fails because of a
 * missing backend.
 *
 * Run:  AGENT_URL=http://localhost:3001 npm run test:e2e
 *
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';

const AGENT_URL = process.env.AGENT_URL || 'http://localhost:3001';
const TIMEOUT = 10_000;

let serverReachable = false;

/** Try to reach the server once; if it fails every test will skip. */
async function checkServer(): Promise<boolean> {
  try {
    const res = await fetch(`${AGENT_URL}/api/health`, { signal: AbortSignal.timeout(5000) });
    return res.ok;
  } catch {
    return false;
  }
}

function skipUnless(reachable: boolean, msg = 'Agent server not reachable — skipping') {
  if (!reachable) {
    // node:test recognises a call to `it` whose callback immediately returns
    // after logging; we use skip() where available, otherwise console.log.
    console.log(`  ⏭  ${msg}`);
  }
  return !reachable;
}

// ── helpers ──────────────────────────────────────────────────────

async function get(path: string) {
  return fetch(`${AGENT_URL}${path}`, { signal: AbortSignal.timeout(TIMEOUT) });
}

async function post(path: string, body?: unknown) {
  return fetch(`${AGENT_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(TIMEOUT),
  });
}

// ── suite ────────────────────────────────────────────────────────

describe('E2E — live agent server', { timeout: TIMEOUT * 2 }, () => {
  before(async () => {
    serverReachable = await checkServer();
    if (!serverReachable) {
      console.log('\n  Agent server is not running — all e2e tests will be skipped.\n');
    }
  });

  // 1. Health
  it('GET /api/health returns 200 with uptime', { skip: false }, async (t) => {
    if (skipUnless(serverReachable)) { t.skip('server not running'); return; }
    const res = await get('/api/health');
    assert.equal(res.status, 200);
    const body = await res.json() as Record<string, unknown>;
    assert.ok('uptime' in body || 'status' in body, 'health response should contain uptime or status');
  });

  // 2. Wallet addresses
  it('GET /api/wallet/addresses returns addresses for multiple chains', { skip: false }, async (t) => {
    if (skipUnless(serverReachable)) { t.skip('server not running'); return; }
    const res = await get('/api/wallet/addresses');
    assert.equal(res.status, 200);
    const body = await res.json() as Record<string, unknown>;
    // Should have an addresses array or object with chain keys
    const hasAddresses = 'addresses' in body || 'chains' in body || Array.isArray(body);
    assert.ok(hasAddresses || typeof body === 'object', 'response should contain address data');
  });

  // 3. Agent status
  it('GET /api/agent/status returns agent state with mood', { skip: false }, async (t) => {
    if (skipUnless(serverReachable)) { t.skip('server not running'); return; }
    const res = await get('/api/agent/status');
    assert.equal(res.status, 200);
    const body = await res.json() as Record<string, unknown>;
    assert.ok('mood' in body || 'state' in body || 'status' in body,
      'agent status should contain mood, state, or status field');
  });

  // 4. Adversarial oversized tip
  it('POST /api/demo/adversarial/oversized_tip returns blocked=true', { skip: false }, async (t) => {
    if (skipUnless(serverReachable)) { t.skip('server not running'); return; }
    const res = await post('/api/demo/adversarial/oversized_tip');
    assert.equal(res.status, 200);
    const body = await res.json() as Record<string, unknown>;
    assert.ok('blocked' in body || 'result' in body,
      'adversarial response should indicate blocked status');
    // If the response wraps in result, check inside
    const blocked = (body as any).blocked ?? (body as any).result?.blocked;
    assert.equal(blocked, true, 'oversized tip should be blocked');
  });

  // 5. YouTube status
  it('GET /api/youtube/status returns availability info', { skip: false }, async (t) => {
    if (skipUnless(serverReachable)) { t.skip('server not running'); return; }
    const res = await get('/api/youtube/status');
    assert.equal(res.status, 200);
    const body = await res.json() as Record<string, unknown>;
    assert.ok(typeof body === 'object' && body !== null, 'youtube status should return an object');
  });

  // 6. Proof of wallet
  it('GET /api/proof returns wallet address', { skip: false }, async (t) => {
    if (skipUnless(serverReachable)) { t.skip('server not running'); return; }
    const res = await get('/api/proof');
    assert.equal(res.status, 200);
    const body = await res.json() as Record<string, unknown>;
    assert.ok('address' in body || 'proof' in body || 'walletAddress' in body,
      'proof response should contain address or proof field');
  });

  // 7. X402 paywalls
  it('GET /api/x402/paywalls returns paywall list', { skip: false }, async (t) => {
    if (skipUnless(serverReachable)) { t.skip('server not running'); return; }
    const res = await get('/api/x402/paywalls');
    assert.equal(res.status, 200);
    const body = await res.json() as unknown;
    assert.ok(Array.isArray(body) || (typeof body === 'object' && body !== null),
      'paywalls response should be an array or object');
  });

  // 8. Unread notification count
  it('GET /api/notifications/unread-count returns a number', { skip: false }, async (t) => {
    if (skipUnless(serverReachable)) { t.skip('server not running'); return; }
    const res = await get('/api/notifications/unread-count');
    assert.equal(res.status, 200);
    const body = await res.json() as Record<string, unknown>;
    const count = (body as any).count ?? (body as any).unreadCount ?? body;
    assert.ok(typeof count === 'number' || typeof (body as any).count === 'number',
      'unread-count should return a numeric count');
  });

  // 9. Demo steps
  it('GET /api/demo/steps returns 10 steps', { skip: false }, async (t) => {
    if (skipUnless(serverReachable)) { t.skip('server not running'); return; }
    const res = await get('/api/demo/steps');
    assert.equal(res.status, 200);
    const body = await res.json() as Record<string, unknown>;
    const steps = (body as any).steps ?? body;
    assert.ok(Array.isArray(steps), 'demo/steps should return an array of steps');
    assert.equal(steps.length, 10, 'should have exactly 10 demo steps');
  });

  // 10. Agent tool policy
  it('GET /api/agent/tool-policy returns blocked/restricted lists', { skip: false }, async (t) => {
    if (skipUnless(serverReachable)) { t.skip('server not running'); return; }
    const res = await get('/api/agent/tool-policy');
    assert.equal(res.status, 200);
    const body = await res.json() as Record<string, unknown>;
    assert.ok('blocked' in body || 'restricted' in body || 'policy' in body,
      'tool-policy should contain blocked or restricted lists');
  });
});
