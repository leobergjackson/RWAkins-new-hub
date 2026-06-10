// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta — GitHub Webhook Integration Service
// Automatic PR/issue tipping for code contributors via GitHub webhooks.

import { createHmac, randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { v4 as uuidv4 } from 'uuid';
import { EventEmitter } from 'node:events';
import { logger } from '../utils/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PERSISTENCE_FILE = join(__dirname, '..', '..', '.github-tipping.json');

// ── Types ────────────────────────────────────────────────────────

export interface GitHubContributor {
  id: string;
  githubUsername: string;
  walletAddress: string;
  totalTipsReceived: number;
  totalTipAmount: number;
  tipHistory: GitHubTipRecord[];
  registeredAt: string;
}

export interface GitHubTipRecord {
  id: string;
  type: 'pr' | 'issue_bounty';
  githubUsername: string;
  walletAddress: string;
  amount: number;
  currency: string;
  reason: string;
  prNumber?: number;
  prTitle?: string;
  issueNumber?: number;
  issueTitle?: string;
  repoFullName: string;
  qualityScore: number;
  txHash?: string;
  status: 'pending' | 'sent' | 'failed';
  createdAt: string;
}

export interface BountyTracker {
  issueNumber: number;
  repoFullName: string;
  amount: number;
  assignee?: string;
  status: 'open' | 'claimed' | 'paid';
  createdAt: string;
}

export interface GitHubTippingStats {
  totalPRsTipped: number;
  totalBountiesPaid: number;
  totalUSDTDistributed: number;
  avgTipAmount: number;
  topContributors: Array<{ username: string; totalAmount: number; tipCount: number }>;
  recentTips: GitHubTipRecord[];
  activeBounties: number;
}

// ── Quality heuristics ───────────────────────────────────────────

interface PRQualityInput {
  linesAdded: number;
  linesRemoved: number;
  filesChanged: number;
  hasTests: boolean;
  title: string;
  body: string;
}

function evaluatePRQuality(input: PRQualityInput): { score: number; reason: string } {
  let score = 0;
  const reasons: string[] = [];

  // Size scoring (0-30 points)
  const totalLines = input.linesAdded + input.linesRemoved;
  if (totalLines >= 10 && totalLines <= 100) {
    score += 25; // Well-scoped PR
    reasons.push('well-scoped change');
  } else if (totalLines > 100 && totalLines <= 500) {
    score += 20;
    reasons.push('medium-sized change');
  } else if (totalLines > 500) {
    score += 15;
    reasons.push('large change');
  } else if (totalLines > 0) {
    score += 10;
    reasons.push('small change');
  }

  // Files changed (0-15 points)
  if (input.filesChanged >= 1 && input.filesChanged <= 5) {
    score += 15;
    reasons.push('focused file changes');
  } else if (input.filesChanged > 5) {
    score += 10;
    reasons.push('multi-file change');
  }

  // Test presence (0-25 points)
  if (input.hasTests) {
    score += 25;
    reasons.push('includes tests');
  }

  // Title quality (0-15 points)
  const titleLower = input.title.toLowerCase();
  if (titleLower.startsWith('fix:') || titleLower.startsWith('feat:') ||
      titleLower.startsWith('refactor:') || titleLower.startsWith('chore:') ||
      titleLower.startsWith('docs:') || titleLower.startsWith('test:')) {
    score += 15;
    reasons.push('conventional commit title');
  } else if (input.title.length >= 10 && input.title.length <= 72) {
    score += 10;
    reasons.push('descriptive title');
  }

  // Description quality (0-15 points)
  if (input.body && input.body.length > 50) {
    score += 15;
    reasons.push('detailed description');
  } else if (input.body && input.body.length > 0) {
    score += 5;
    reasons.push('has description');
  }

  return { score: Math.min(score, 100), reason: reasons.join(', ') };
}

function qualityScoreToTipAmount(score: number): number {
  // Map 0-100 quality score to 0.50-5.00 USDT
  const minTip = 0.50;
  const maxTip = 5.00;
  const normalized = Math.max(0, Math.min(score, 100)) / 100;
  const amount = minTip + normalized * (maxTip - minTip);
  return Math.round(amount * 100) / 100;
}

// ── Service ──────────────────────────────────────────────────────

export class GitHubWebhookService extends EventEmitter {
  private contributors = new Map<string, GitHubContributor>();
  private tips: GitHubTipRecord[] = [];
  private bounties: BountyTracker[] = [];
  private webhookSecret: string;

  constructor() {
    super();
    this.webhookSecret = process.env.GITHUB_WEBHOOK_SECRET ?? randomUUID();
    this.loadState();
    logger.info('GitHubWebhookService initialized', {
      contributors: this.contributors.size,
      tips: this.tips.length,
      bounties: this.bounties.length,
    });
  }

  // ── Webhook signature verification ─────────────────────────────

  verifySignature(payload: string, signature: string): boolean {
    if (!signature) return false;
    const expected = 'sha256=' + createHmac('sha256', this.webhookSecret)
      .update(payload)
      .digest('hex');
    // Constant-time comparison
    if (expected.length !== signature.length) return false;
    let result = 0;
    for (let i = 0; i < expected.length; i++) {
      result |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
    }
    return result === 0;
  }

  // ── Webhook event processing ───────────────────────────────────

  processWebhookEvent(event: string, payload: Record<string, unknown>): {
    action: string;
    tip?: GitHubTipRecord;
    bounty?: BountyTracker;
    message: string;
  } {
    switch (event) {
      case 'pull_request':
        return this.handlePullRequest(payload);
      case 'issues':
        return this.handleIssue(payload);
      case 'issue_comment':
        return this.handleIssueComment(payload);
      case 'push':
        return this.handlePush(payload);
      default:
        return { action: 'ignored', message: `Unhandled event type: ${event}` };
    }
  }

  private handlePullRequest(payload: Record<string, unknown>): {
    action: string;
    tip?: GitHubTipRecord;
    message: string;
  } {
    const action = payload.action as string;
    if (action !== 'closed') {
      return { action: 'skipped', message: `PR action '${action}' — only 'closed' triggers tips` };
    }

    const pr = payload.pull_request as Record<string, unknown> | undefined;
    if (!pr) {
      return { action: 'error', message: 'Missing pull_request in payload' };
    }

    const merged = pr.merged as boolean;
    if (!merged) {
      return { action: 'skipped', message: 'PR closed without merge — no tip' };
    }

    const repo = payload.repository as Record<string, unknown> | undefined;
    const repoFullName = (repo?.full_name as string) ?? 'unknown/repo';
    const prNumber = pr.number as number;
    const prTitle = (pr.title as string) ?? '';
    const prBody = (pr.body as string) ?? '';
    const user = pr.user as Record<string, unknown> | undefined;
    const githubUsername = (user?.login as string) ?? 'unknown';

    // Determine lines changed and files
    const linesAdded = (pr.additions as number) ?? 0;
    const linesRemoved = (pr.deletions as number) ?? 0;
    const filesChanged = (pr.changed_files as number) ?? 0;

    // Simple test detection: check if any file path includes "test" or "spec"
    const hasTests = prTitle.toLowerCase().includes('test') ||
                     prBody.toLowerCase().includes('test');

    const quality = evaluatePRQuality({
      linesAdded,
      linesRemoved,
      filesChanged,
      hasTests,
      title: prTitle,
      body: prBody,
    });

    const tipAmount = qualityScoreToTipAmount(quality.score);

    // Look up contributor wallet
    const contributor = this.contributors.get(githubUsername.toLowerCase());
    const walletAddress = contributor?.walletAddress ?? '';

    const tip: GitHubTipRecord = {
      id: uuidv4(),
      type: 'pr',
      githubUsername,
      walletAddress,
      amount: tipAmount,
      currency: 'USDT',
      reason: quality.reason,
      prNumber,
      prTitle,
      repoFullName,
      qualityScore: quality.score,
      status: walletAddress ? 'pending' : 'failed',
      createdAt: new Date().toISOString(),
    };

    if (!walletAddress) {
      tip.status = 'failed';
      logger.warn('PR tip: no wallet registered', { githubUsername, prNumber });
    }

    this.tips.push(tip);

    // Update contributor stats
    if (contributor) {
      contributor.totalTipsReceived += 1;
      contributor.totalTipAmount += tipAmount;
      contributor.tipHistory.push(tip);
    }

    this.saveState();
    this.emit('tip:created', tip);

    const statusMsg = walletAddress
      ? `Tip of ${tipAmount} USDT queued for @${githubUsername}`
      : `Tip calculated but @${githubUsername} has no wallet registered`;

    return {
      action: 'tip_created',
      tip,
      message: `PR #${prNumber} merged — quality ${quality.score}/100 (${quality.reason}). ${statusMsg}`,
    };
  }

  private handleIssue(payload: Record<string, unknown>): {
    action: string;
    tip?: GitHubTipRecord;
    bounty?: BountyTracker;
    message: string;
  } {
    const action = payload.action as string;
    const issue = payload.issue as Record<string, unknown> | undefined;
    if (!issue) {
      return { action: 'error', message: 'Missing issue in payload' };
    }

    const repo = payload.repository as Record<string, unknown> | undefined;
    const repoFullName = (repo?.full_name as string) ?? 'unknown/repo';
    const issueNumber = issue.number as number;
    const issueTitle = (issue.title as string) ?? '';
    const labels = (issue.labels as Array<Record<string, unknown>>) ?? [];
    const labelNames = labels.map(l => (l.name as string) ?? '').filter(Boolean);

    // Bounty label detection
    if (action === 'labeled' && labelNames.some(l => l.toLowerCase().includes('bounty'))) {
      const bountyLabel = labelNames.find(l => l.toLowerCase().includes('bounty')) ?? 'bounty';
      // Try to extract amount from label (e.g., "bounty:2.00" or "bounty-5")
      const amountMatch = bountyLabel.match(/(\d+(?:\.\d+)?)/);
      const bountyAmount = amountMatch ? parseFloat(amountMatch[1]) : 2.00;

      const bounty: BountyTracker = {
        issueNumber,
        repoFullName,
        amount: bountyAmount,
        status: 'open',
        createdAt: new Date().toISOString(),
      };

      // Check if bounty already tracked
      const existing = this.bounties.find(
        b => b.issueNumber === issueNumber && b.repoFullName === repoFullName,
      );
      if (!existing) {
        this.bounties.push(bounty);
        this.saveState();
        this.emit('bounty:created', bounty);
      }

      return {
        action: 'bounty_tracked',
        bounty: existing ?? bounty,
        message: `Bounty of ${bountyAmount} USDT tracked for issue #${issueNumber} (${issueTitle})`,
      };
    }

    // Issue closed — pay bounty to assignee
    if (action === 'closed') {
      const stateReason = (issue.state_reason as string) ?? 'completed';
      if (stateReason !== 'completed') {
        return { action: 'skipped', message: `Issue #${issueNumber} closed as '${stateReason}' — no bounty payout` };
      }

      const bounty = this.bounties.find(
        b => b.issueNumber === issueNumber && b.repoFullName === repoFullName && b.status === 'open',
      );
      if (!bounty) {
        return { action: 'skipped', message: `Issue #${issueNumber} closed — no bounty attached` };
      }

      // Determine assignee
      const assignees = (issue.assignees as Array<Record<string, unknown>>) ?? [];
      const assignee = assignees.length > 0
        ? (assignees[0].login as string) ?? ''
        : ((issue.user as Record<string, unknown>)?.login as string) ?? '';

      bounty.assignee = assignee;
      bounty.status = 'claimed';

      const contributor = this.contributors.get(assignee.toLowerCase());
      const walletAddress = contributor?.walletAddress ?? '';

      const tip: GitHubTipRecord = {
        id: uuidv4(),
        type: 'issue_bounty',
        githubUsername: assignee,
        walletAddress,
        amount: bounty.amount,
        currency: 'USDT',
        reason: `Bounty payout for issue #${issueNumber}`,
        issueNumber,
        issueTitle,
        repoFullName,
        qualityScore: 100, // Bounties always pay full
        status: walletAddress ? 'pending' : 'failed',
        createdAt: new Date().toISOString(),
      };

      this.tips.push(tip);
      bounty.status = 'paid';

      if (contributor) {
        contributor.totalTipsReceived += 1;
        contributor.totalTipAmount += bounty.amount;
        contributor.tipHistory.push(tip);
      }

      this.saveState();
      this.emit('tip:created', tip);
      this.emit('bounty:paid', bounty);

      return {
        action: 'bounty_paid',
        tip,
        bounty,
        message: `Bounty of ${bounty.amount} USDT paid to @${assignee} for issue #${issueNumber}`,
      };
    }

    return { action: 'skipped', message: `Issue action '${action}' — no tip action required` };
  }

  private handleIssueComment(payload: Record<string, unknown>): {
    action: string;
    message: string;
  } {
    const action = payload.action as string;
    if (action !== 'created') {
      return { action: 'skipped', message: 'Comment action not created — skipped' };
    }
    const comment = payload.comment as Record<string, unknown> | undefined;
    const body = (comment?.body as string) ?? '';
    const user = (comment?.user as Record<string, unknown>);
    const username = (user?.login as string) ?? 'unknown';

    // Check for tip commands like "/tip @user 1.00"
    const tipMatch = body.match(/\/tip\s+@?(\S+)\s+(\d+(?:\.\d+)?)/);
    if (tipMatch) {
      const [, targetUser, amountStr] = tipMatch;
      const amount = parseFloat(amountStr);
      logger.info('Tip command detected in comment', { from: username, to: targetUser, amount });
      return {
        action: 'tip_command',
        message: `Tip command from @${username}: /tip @${targetUser} ${amount} USDT — use POST /api/github/webhook to process`,
      };
    }

    return { action: 'skipped', message: 'No tip command in comment' };
  }

  private handlePush(payload: Record<string, unknown>): {
    action: string;
    message: string;
  } {
    const commits = (payload.commits as Array<Record<string, unknown>>) ?? [];
    const repo = payload.repository as Record<string, unknown> | undefined;
    const repoFullName = (repo?.full_name as string) ?? 'unknown/repo';

    return {
      action: 'logged',
      message: `Push event: ${commits.length} commit(s) to ${repoFullName}`,
    };
  }

  // ── Contributor registration ───────────────────────────────────

  registerContributor(githubUsername: string, walletAddress: string): GitHubContributor {
    const key = githubUsername.toLowerCase();
    const existing = this.contributors.get(key);
    if (existing) {
      existing.walletAddress = walletAddress;
      this.saveState();
      return existing;
    }

    const contributor: GitHubContributor = {
      id: uuidv4(),
      githubUsername,
      walletAddress,
      totalTipsReceived: 0,
      totalTipAmount: 0,
      tipHistory: [],
      registeredAt: new Date().toISOString(),
    };

    this.contributors.set(key, contributor);
    this.saveState();
    this.emit('contributor:registered', contributor);
    logger.info('GitHub contributor registered', { githubUsername, walletAddress });
    return contributor;
  }

  getContributor(githubUsername: string): GitHubContributor | undefined {
    return this.contributors.get(githubUsername.toLowerCase());
  }

  listContributors(): GitHubContributor[] {
    return Array.from(this.contributors.values());
  }

  // ── Statistics ─────────────────────────────────────────────────

  getStats(): GitHubTippingStats {
    const prTips = this.tips.filter(t => t.type === 'pr');
    const bountyTips = this.tips.filter(t => t.type === 'issue_bounty');
    const totalDistributed = this.tips.reduce((sum, t) => sum + t.amount, 0);

    // Top contributors by total amount
    const contributorTotals = new Map<string, { totalAmount: number; tipCount: number }>();
    for (const tip of this.tips) {
      const entry = contributorTotals.get(tip.githubUsername) ?? { totalAmount: 0, tipCount: 0 };
      entry.totalAmount += tip.amount;
      entry.tipCount += 1;
      contributorTotals.set(tip.githubUsername, entry);
    }

    const topContributors = Array.from(contributorTotals.entries())
      .map(([username, data]) => ({ username, ...data }))
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, 10);

    const recentTips = [...this.tips]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 20);

    const activeBounties = this.bounties.filter(b => b.status === 'open').length;

    return {
      totalPRsTipped: prTips.length,
      totalBountiesPaid: bountyTips.length,
      totalUSDTDistributed: Math.round(totalDistributed * 100) / 100,
      avgTipAmount: this.tips.length > 0
        ? Math.round((totalDistributed / this.tips.length) * 100) / 100
        : 0,
      topContributors,
      recentTips,
      activeBounties,
    };
  }

  getTips(): GitHubTipRecord[] {
    return [...this.tips].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  getBounties(): BountyTracker[] {
    return [...this.bounties];
  }

  // ── Persistence ────────────────────────────────────────────────

  private loadState(): void {
    try {
      if (existsSync(PERSISTENCE_FILE)) {
        const raw = readFileSync(PERSISTENCE_FILE, 'utf-8');
        const state = JSON.parse(raw) as {
          contributors?: Array<[string, GitHubContributor]>;
          tips?: GitHubTipRecord[];
          bounties?: BountyTracker[];
        };
        if (state.contributors) {
          this.contributors = new Map(state.contributors);
        }
        if (state.tips) {
          this.tips = state.tips;
        }
        if (state.bounties) {
          this.bounties = state.bounties;
        }
        logger.info('GitHub tipping state loaded', {
          contributors: this.contributors.size,
          tips: this.tips.length,
        });
      }
    } catch (err) {
      logger.warn('Failed to load GitHub tipping state', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  private saveState(): void {
    try {
      const state = {
        contributors: Array.from(this.contributors.entries()),
        tips: this.tips,
        bounties: this.bounties,
      };
      writeFileSync(PERSISTENCE_FILE, JSON.stringify(state, null, 2), 'utf-8');
    } catch (err) {
      logger.warn('Failed to save GitHub tipping state', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
}
