// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta SDK — Express Integration Example
//
// Shows how to add AeroFyta autonomous payment intelligence to any
// existing Express application with a single middleware call.
//
// Run: npx tsx agent/src/sdk/examples/express-integration.ts

/* eslint-disable no-console */

import express from 'express';
import { aerofytaMiddleware } from '../middleware.js';

const app = express();
app.use(express.json());

// ── Your existing routes ────────────────────────────────────────

app.get('/', (_req, res) => {
  res.json({
    app: 'My Creator Platform',
    version: '1.0.0',
    aerofyta: 'enabled',
  });
});

// ── Add AeroFyta with one line ──────────────────────────────────

app.use(
  '/api',
  aerofytaMiddleware({
    seed: process.env.WDK_SEED ?? 'test test test test test test test test test test test junk',
    llmProvider: 'rule-based',
  }),
);

// ── Use AeroFyta in your routes ─────────────────────────────────

app.post('/api/tip-creator', async (req, res) => {
  try {
    const { recipient, amount, chain } = req.body;

    // Validate first
    const validation = req.aerofyta.validateTip({ recipient, amount, chain });
    if (!validation.allowed) {
      res.status(400).json({ error: validation.reason, policy: validation.policy });
      return;
    }

    // Execute the tip
    const result = await req.aerofyta.tip(recipient, amount, chain);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.get('/api/mood', async (req, res) => {
  const mood = await req.aerofyta.getWalletMood();
  res.json(mood);
});

app.get('/api/pulse', async (req, res) => {
  const pulse = await req.aerofyta.getFinancialPulse();
  res.json(pulse);
});

app.get('/api/balances', async (req, res) => {
  const balances = await req.aerofyta.getBalances();
  res.json(balances);
});

app.get('/api/security', (req, res) => {
  const report = req.aerofyta.getSecurityReport();
  res.json(report);
});

app.post('/api/ask', async (req, res) => {
  const { question } = req.body;
  const answer = await req.aerofyta.ask(question);
  res.json(answer);
});

// ── Start ───────────────────────────────────────────────────────

const PORT = Number(process.env.PORT) || 3002;
app.listen(PORT, () => {
  console.log(`Creator Platform + AeroFyta running on http://localhost:${PORT}`);
  console.log('Endpoints:');
  console.log('  POST /api/tip-creator  — Send a tip');
  console.log('  GET  /api/mood         — Wallet mood');
  console.log('  GET  /api/pulse        — Financial pulse');
  console.log('  GET  /api/balances     — All chain balances');
  console.log('  GET  /api/security     — Security report');
  console.log('  POST /api/ask          — Ask the agent anything');
});
