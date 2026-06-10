// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta — Settings, contacts, templates, personality & misc route handlers (extracted from api.ts)

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import type { TipFlowAgent } from '../core/agent.js';
import type { PersonalityType, AgentSettings, ChainId, TokenType, TipLink } from '../types/index.js';
import { logger } from '../utils/logger.js';
import type { ContactsService } from '../services/contacts.service.js';
import type { TemplatesService } from '../services/templates.service.js';
import type { PersonalityService } from '../services/personality.service.js';
import type { ENSService } from '../services/ens.service.js';
import type { TagsService } from '../services/tags.service.js';
import type { ChallengesService } from '../services/challenges.service.js';
import type { LimitsService } from '../services/limits.service.js';

// WDK type imports for wallet settings configuration via Tether Wallet Development Kit
import type WDK from '@tetherto/wdk';
import type WalletManagerEvm from '@tetherto/wdk-wallet-evm';
// Settings routes configure WDK wallet preferences, chain defaults, and ENS resolution
export type _WdkRefs = WDK | WalletManagerEvm; // eslint-disable-line @typescript-eslint/no-unused-vars
import type { GoalsService } from '../services/goals.service.js';

export interface SettingsDeps {
  agent: TipFlowAgent;
  contacts: ContactsService;
  templates: TemplatesService;
  personality: PersonalityService;
  ensService: ENSService;
  tagsService: TagsService;
  challenges: ChallengesService;
  limitsService: LimitsService;
  goalsService: GoalsService;
}

/** In-memory agent settings (shared with api.ts via getter/setter) */
let agentSettings: AgentSettings = {
  personality: 'friendly',
  defaultChain: '',
  defaultToken: 'native',
  autoConfirmThreshold: '0.01',
  autoConfirmEnabled: false,
  notifications: {
    tipSent: true,
    tipFailed: true,
    conditionTriggered: true,
    scheduledExecuted: true,
  },
};

export function getAgentSettings(): AgentSettings { return agentSettings; }

/** In-memory tip link store */
const tipLinks: TipLink[] = [];

/**
 * Register settings, contacts, templates, personality, tiplinks, ENS,
 * tags, challenges, calendar, limits, audit, and goals routes.
 */
export function registerSettingsRoutes(
  router: Router,
  deps: SettingsDeps,
): void {
  const { agent, contacts, templates, personality, ensService, tagsService, challenges, limitsService, goalsService } = deps;

  // ── Address Book Contacts ──────────────────────────────────────

  /** GET /api/contacts/groups — List all unique group names */
  router.get('/contacts/groups', (_req, res) => {
    res.json({ groups: contacts.getGroups() });
  });

  /** GET /api/contacts/export/csv — Export all contacts as CSV */
  router.get('/contacts/export/csv', (_req, res) => {
    const data = contacts.exportContacts();
    const header = 'name,address,group,tipCount';
    const rows = data.map((c) => {
      const escapeCsv = (v: string) =>
        v.includes(',') || v.includes('"') || v.includes('\n') ? `"${v.replace(/"/g, '""')}"` : v;
      return `${escapeCsv(c.name)},${escapeCsv(c.address)},${escapeCsv(c.group ?? '')},${c.tipCount}`;
    });
    const csv = [header, ...rows].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="aerofyta-contacts.csv"');
    res.send(csv);
  });

  /** GET /api/contacts/export — Export all contacts as JSON */
  router.get('/contacts/export', (_req, res) => {
    const data = contacts.exportContacts();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="aerofyta-contacts.json"');
    res.json(data);
  });

  /** POST /api/contacts/import — Import contacts from JSON array */
  router.post('/contacts/import', (req, res) => {
    try {
      const body = req.body;
      if (!Array.isArray(body)) {
        res.status(400).json({ error: 'Request body must be a JSON array of contacts' });
        return;
      }
      const result = contacts.importContacts(body);
      res.json(result);
    } catch (err) {
      logger.error('Failed to import contacts', { error: String(err) });
      res.status(500).json({ error: 'Failed to import contacts' });
    }
  });

  /** GET /api/contacts — List all contacts, optionally filtered by group */
  router.get('/contacts', (req, res) => {
    const group = req.query.group as string | undefined;
    if (group) {
      res.json({ contacts: contacts.getContactsByGroup(group) });
    } else {
      res.json({ contacts: contacts.getContacts() });
    }
  });

  /** POST /api/contacts — Add a contact */
  router.post('/contacts', (req, res) => {
    try {
      const { name, address, chain, group } = req.body as {
        name: string;
        address: string;
        chain?: ChainId;
        group?: string;
      };

      if (!name || !address) {
        res.status(400).json({ error: 'name and address are required' });
        return;
      }

      const contact = contacts.addContact(name, address, chain, group);
      agent.addActivity({ type: 'contact_saved', message: `Contact saved: ${name}`, detail: address.slice(0, 10) + '...' });
      res.json({ contact });
    } catch (err) {
      logger.error('Failed to add contact', { error: String(err) });
      res.status(500).json({ error: 'Failed to add contact' });
    }
  });

  /** PUT /api/contacts/:id — Update a contact */
  router.put('/contacts/:id', (req, res) => {
    const { id } = req.params;
    const { name, group } = req.body as { name?: string; group?: string };
    const updated = contacts.updateContact(id, { name, group });
    if (!updated) {
      res.status(404).json({ error: 'Contact not found' });
      return;
    }
    res.json({ contact: updated });
  });

  /** DELETE /api/contacts/:id — Delete a contact */
  router.delete('/contacts/:id', (req, res) => {
    const { id } = req.params;
    const deleted = contacts.deleteContact(id);
    if (!deleted) {
      res.status(404).json({ error: 'Contact not found' });
      return;
    }
    res.json({ deleted: true, id });
  });

  // ── Tip Templates ──────────────────────────────────────────────

  /** GET /api/templates — List all templates */
  router.get('/templates', (_req, res) => {
    res.json({ templates: templates.getTemplates() });
  });

  /** POST /api/templates — Create a template */
  router.post('/templates', (req, res) => {
    try {
      const { name, recipient, amount, token, chainId } = req.body as {
        name: string;
        recipient: string;
        amount: string;
        token?: 'native' | 'usdt';
        chainId?: string;
      };

      if (!name || !recipient || !amount) {
        res.status(400).json({ error: 'name, recipient, and amount are required' });
        return;
      }

      const template = templates.addTemplate({
        name,
        recipient,
        amount,
        token: token ?? 'native',
        chainId,
      });
      res.json({ template });
    } catch (err) {
      logger.error('Failed to create template', { error: String(err) });
      res.status(500).json({ error: 'Failed to create template' });
    }
  });

  /** DELETE /api/templates/:id — Delete a template */
  router.delete('/templates/:id', (req, res) => {
    const { id } = req.params;
    const deleted = templates.deleteTemplate(id);
    if (!deleted) {
      res.status(404).json({ error: 'Template not found' });
      return;
    }
    res.json({ deleted: true, id });
  });

  // ── Settings & Personality ──────────────────────────────────

  /** GET /api/settings — Get current agent settings */
  router.get('/settings', (_req, res) => {
    res.json({ settings: agentSettings });
  });

  /** PUT /api/settings — Update agent settings */
  router.put('/settings', (req, res) => {
    try {
      const body = req.body as Partial<AgentSettings>;

      if (body.personality !== undefined) {
        const validPersonalities: PersonalityType[] = ['professional', 'friendly', 'pirate', 'emoji', 'minimal'];
        if (!validPersonalities.includes(body.personality)) {
          res.status(400).json({ error: `Invalid personality. Must be one of: ${validPersonalities.join(', ')}` });
          return;
        }
        agentSettings.personality = body.personality;
        personality.setPersonality(body.personality);
      }

      if (body.defaultChain !== undefined) {
        agentSettings.defaultChain = body.defaultChain;
      }

      if (body.defaultToken !== undefined) {
        if (body.defaultToken !== 'native' && body.defaultToken !== 'usdt' && body.defaultToken !== 'usat') {
          res.status(400).json({ error: 'defaultToken must be "native", "usdt", or "usat"' });
          return;
        }
        agentSettings.defaultToken = body.defaultToken;
      }

      if (body.autoConfirmThreshold !== undefined) {
        agentSettings.autoConfirmThreshold = body.autoConfirmThreshold;
      }

      if (body.autoConfirmEnabled !== undefined) {
        agentSettings.autoConfirmEnabled = body.autoConfirmEnabled;
      }

      if (body.notifications !== undefined) {
        agentSettings.notifications = {
          ...agentSettings.notifications,
          ...body.notifications,
        };
      }

      logger.info('Agent settings updated', { settings: agentSettings });
      res.json({ settings: agentSettings });
    } catch (err) {
      logger.error('Failed to update settings', { error: String(err) });
      res.status(500).json({ error: 'Failed to update settings' });
    }
  });

  /** GET /api/personality — Get available personalities and active one */
  router.get('/personality', (_req, res) => {
    res.json({
      active: personality.getActivePersonality(),
      personalities: personality.getPersonalities(),
    });
  });

  /** PUT /api/personality — Set the active personality */
  router.put('/personality', (req, res) => {
    try {
      const { type } = req.body as { type?: PersonalityType };
      if (!type) {
        res.status(400).json({ error: 'type is required' });
        return;
      }

      const success = personality.setPersonality(type);
      if (!success) {
        res.status(400).json({ error: `Invalid personality type: ${type}` });
        return;
      }

      agentSettings.personality = type;
      res.json({
        active: personality.getActivePersonality(),
        definition: personality.getActiveDefinition(),
      });
    } catch (err) {
      logger.error('Failed to set personality', { error: String(err) });
      res.status(500).json({ error: 'Failed to set personality' });
    }
  });

  // -- Tip Links ----------------------------------------------------------

  /** POST /api/tiplinks - Create a shareable tip link */
  router.post('/tiplinks', (req, res) => {
    try {
      const { recipient, amount, token, message, chainId } = req.body as {
        recipient?: string;
        amount?: string;
        token?: string;
        message?: string;
        chainId?: string;
      };

      if (!recipient || !amount) {
        res.status(400).json({ error: 'recipient and amount are required' });
        return;
      }

      const id = uuidv4().slice(0, 8);
      const tipLink: TipLink = {
        id,
        recipient,
        amount,
        token: (token as TokenType) || 'native',
        message: message || undefined,
        chainId: (chainId as ChainId) || undefined,
        url: `?tiplink=${id}`,
        createdAt: new Date().toISOString(),
      };

      tipLinks.push(tipLink);
      logger.info('Tip link created', { id, recipient, amount });
      res.json({ tipLink });
    } catch (err) {
      logger.error('Failed to create tip link', { error: String(err) });
      res.status(500).json({ error: 'Failed to create tip link' });
    }
  });

  /** GET /api/tiplinks - List all tip links */
  router.get('/tiplinks', (_req, res) => {
    res.json({ tipLinks: [...tipLinks].reverse() });
  });

  /** GET /api/tiplinks/:id - Get a single tip link */
  router.get('/tiplinks/:id', (req, res) => {
    const link = tipLinks.find((l) => l.id === req.params.id);
    if (!link) {
      res.status(404).json({ error: 'Tip link not found' });
      return;
    }
    res.json({ tipLink: link });
  });

  /** DELETE /api/tiplinks/:id - Delete a tip link */
  router.delete('/tiplinks/:id', (req, res) => {
    const idx = tipLinks.findIndex((l) => l.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Tip link not found' });
      return;
    }
    tipLinks.splice(idx, 1);
    logger.info('Tip link deleted', { id: req.params.id });
    res.json({ deleted: true, id: req.params.id });
  });

  // ── ENS Resolution ──────────────────────────────────────────────────

  /** GET /api/ens/resolve?name=vitalik.eth — Resolve ENS name to address */
  router.get('/ens/resolve', async (req, res) => {
    try {
      const name = req.query.name as string | undefined;
      if (!name || !name.endsWith('.eth')) {
        res.status(400).json({ error: 'Query parameter "name" is required and must end with .eth' });
        return;
      }
      const address = await ensService.resolveENS(name);
      if (address) {
        res.json({ name, address, resolved: true });
      } else {
        res.json({ name, address: null, resolved: false });
      }
    } catch (err) {
      logger.error('ENS resolve error', { error: String(err) });
      res.status(500).json({ error: 'ENS resolution failed' });
    }
  });

  /** GET /api/ens/reverse?address=0x... — Reverse lookup address to ENS name */
  router.get('/ens/reverse', async (req, res) => {
    try {
      const address = req.query.address as string | undefined;
      if (!address || !address.startsWith('0x')) {
        res.status(400).json({ error: 'Query parameter "address" is required and must start with 0x' });
        return;
      }
      const name = await ensService.lookupAddress(address);
      if (name) {
        res.json({ address, name, resolved: true });
      } else {
        res.json({ address, name: null, resolved: false });
      }
    } catch (err) {
      logger.error('ENS reverse lookup error', { error: String(err) });
      res.status(500).json({ error: 'ENS reverse lookup failed' });
    }
  });

  // ── Address Tags ────────────────────────────────────────────────────

  /** GET /api/tags — List all address tags */
  router.get('/tags', (_req, res) => {
    res.json({ tags: tagsService.getTags() });
  });

  /** GET /api/tags/:address — Get tag for a specific address */
  router.get('/tags/:address', (req, res) => {
    const tag = tagsService.getTag(req.params.address);
    if (tag) {
      res.json({ tag });
    } else {
      res.status(404).json({ error: 'No tag found for this address' });
    }
  });

  /** POST /api/tags — Add or update an address tag */
  router.post('/tags', (req, res) => {
    const { address, label, color } = req.body as { address?: string; label?: string; color?: string };
    if (!address || !label) {
      res.status(400).json({ error: 'address and label are required' });
      return;
    }
    const tag = tagsService.addTag(address, label, color);
    res.json({ tag });
  });

  /** DELETE /api/tags/:address — Remove an address tag */
  router.delete('/tags/:address', (req, res) => {
    const deleted = tagsService.deleteTag(req.params.address);
    if (deleted) {
      res.json({ deleted: true, address: req.params.address });
    } else {
      res.status(404).json({ error: 'No tag found for this address' });
    }
  });

  // ── Challenges & Streaks ──────────────────────────────────────────

  /** GET /api/challenges — Active challenges with progress */
  router.get('/challenges', (_req, res) => {
    try {
      const { daily, weekly } = challenges.getChallenges();
      const streak = challenges.getStreakData();
      res.json({ daily, weekly, streak });
    } catch (err) {
      logger.error('Failed to get challenges', { error: String(err) });
      res.status(500).json({ error: 'Failed to get challenges' });
    }
  });

  /** POST /api/challenges/refresh — Reset daily challenges */
  router.post('/challenges/refresh', (_req, res) => {
    try {
      challenges.resetDailyChallenges();
      const { daily, weekly } = challenges.getChallenges();
      const streak = challenges.getStreakData();
      res.json({ daily, weekly, streak });
    } catch (err) {
      logger.error('Failed to refresh challenges', { error: String(err) });
      res.status(500).json({ error: 'Failed to refresh challenges' });
    }
  });

  // ── Calendar View ─────────────────────────────────────────────

  /** GET /api/calendar — Get scheduled/recurring tips projected onto a month grid */
  router.get('/calendar', (req, res) => {
    try {
      const now = new Date();
      const month = parseInt(req.query.month as string, 10) || (now.getMonth() + 1);
      const year = parseInt(req.query.year as string, 10) || now.getFullYear();

      if (month < 1 || month > 12 || year < 2000 || year > 2100) {
        res.status(400).json({ error: 'Invalid month or year' });
        return;
      }

      const tips = agent.getScheduledTips();
      const firstDay = new Date(year, month - 1, 1);
      const lastDay = new Date(year, month, 0);
      const daysInMonth = lastDay.getDate();

      const dayMap = new Map<string, Array<{
        id: string;
        recipient: string;
        amount: string;
        token: string;
        chain?: string;
        message?: string;
        recurring: boolean;
        interval?: string;
        scheduledAt: string;
        status: string;
      }>>();

      for (const tip of tips) {
        const tipDate = new Date(tip.scheduledAt);

        if (tip.recurring && tip.status === 'scheduled') {
          for (let day = 1; day <= daysInMonth; day++) {
            const checkDate = new Date(year, month - 1, day);
            if (checkDate < tipDate && !tip.lastExecuted) continue;

            let shouldShow = false;
            if (tip.interval === 'daily') {
              shouldShow = checkDate >= firstDay;
            } else if (tip.interval === 'weekly') {
              shouldShow = checkDate.getDay() === tipDate.getDay();
            } else if (tip.interval === 'monthly') {
              shouldShow = checkDate.getDate() === tipDate.getDate();
            }

            if (shouldShow && checkDate >= tipDate) {
              const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              if (!dayMap.has(dateStr)) dayMap.set(dateStr, []);
              dayMap.get(dateStr)!.push({
                id: tip.id,
                recipient: tip.recipient,
                amount: tip.amount,
                token: tip.token || 'native',
                chain: tip.chain,
                message: tip.message,
                recurring: true,
                interval: tip.interval,
                scheduledAt: tip.scheduledAt,
                status: tip.status,
              });
            }
          }
        } else {
          if (tipDate.getMonth() + 1 === month && tipDate.getFullYear() === year) {
            const day = tipDate.getDate();
            const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            if (!dayMap.has(dateStr)) dayMap.set(dateStr, []);
            dayMap.get(dateStr)!.push({
              id: tip.id,
              recipient: tip.recipient,
              amount: tip.amount,
              token: tip.token || 'native',
              chain: tip.chain,
              message: tip.message,
              recurring: !!tip.recurring,
              interval: tip.interval,
              scheduledAt: tip.scheduledAt,
              status: tip.status,
            });
          }
        }
      }

      const events = Array.from(dayMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, dateTips]) => ({ date, tips: dateTips }));

      res.json({ month, year, events });
    } catch (err) {
      logger.error('Failed to get calendar data', { error: String(err) });
      res.status(500).json({ error: 'Failed to get calendar data' });
    }
  });

  // ── Spending Limits ────────────────────────────────────────────

  /** GET /api/limits — Get current spending limits and totals */
  router.get('/limits', (_req, res) => {
    try {
      const spending = limitsService.getSpending();
      res.json({ spending });
    } catch (err) {
      logger.error('Failed to get spending limits', { error: String(err) });
      res.status(500).json({ error: 'Failed to get spending limits' });
    }
  });

  /** PUT /api/limits — Update spending limits */
  router.put('/limits', (req, res) => {
    try {
      const body = req.body as {
        dailyLimit?: number;
        weeklyLimit?: number;
        perTipLimit?: number;
        currency?: string;
      };

      if (body.dailyLimit !== undefined && (typeof body.dailyLimit !== 'number' || body.dailyLimit < 0)) {
        res.status(400).json({ error: 'dailyLimit must be a non-negative number' });
        return;
      }
      if (body.weeklyLimit !== undefined && (typeof body.weeklyLimit !== 'number' || body.weeklyLimit < 0)) {
        res.status(400).json({ error: 'weeklyLimit must be a non-negative number' });
        return;
      }
      if (body.perTipLimit !== undefined && (typeof body.perTipLimit !== 'number' || body.perTipLimit < 0)) {
        res.status(400).json({ error: 'perTipLimit must be a non-negative number' });
        return;
      }

      const limits = limitsService.setLimits(body);
      res.json({ limits });
    } catch (err) {
      logger.error('Failed to update spending limits', { error: String(err) });
      res.status(500).json({ error: 'Failed to update spending limits' });
    }
  });

  // ── Audit Log ─────────────────────────────────────────────────

  /** GET /api/audit — Get audit log entries with optional filters */
  router.get('/audit', (req, res) => {
    try {
      const filters = {
        eventType: req.query.eventType as string | undefined,
        dateFrom: req.query.dateFrom as string | undefined,
        dateTo: req.query.dateTo as string | undefined,
        search: req.query.search as string | undefined,
      };
      const entries = limitsService.getAuditLog(filters);
      res.json({ entries });
    } catch (err) {
      logger.error('Failed to get audit log', { error: String(err) });
      res.status(500).json({ error: 'Failed to get audit log' });
    }
  });

  // ── Goals (Fundraising Targets) ──────────────────────────────

  /** GET /api/goals — List all goals */
  router.get('/goals', (_req, res) => {
    try {
      const goals = goalsService.getGoals();
      res.json({ goals });
    } catch (err) {
      logger.error('Failed to get goals', { error: String(err) });
      res.status(500).json({ error: 'Failed to get goals' });
    }
  });

  /** POST /api/goals — Create a new goal */
  router.post('/goals', (req, res) => {
    try {
      const { title, description, targetAmount, token, recipient, deadline } = req.body;
      if (!title || typeof title !== 'string' || title.trim().length === 0) {
        res.status(400).json({ error: 'title is required' });
        return;
      }
      if (!targetAmount || typeof targetAmount !== 'number' || targetAmount <= 0) {
        res.status(400).json({ error: 'targetAmount must be a positive number' });
        return;
      }
      if (!token || typeof token !== 'string') {
        res.status(400).json({ error: 'token is required (native, usdt, or any)' });
        return;
      }

      const goal = goalsService.createGoal({
        title: title.trim(),
        description: description ?? '',
        targetAmount,
        token,
        recipient,
        deadline,
      });

      res.status(201).json({ goal });
    } catch (err) {
      logger.error('Failed to create goal', { error: String(err) });
      res.status(500).json({ error: 'Failed to create goal' });
    }
  });

  /** PUT /api/goals/:id — Update a goal */
  router.put('/goals/:id', (req, res) => {
    try {
      const { id } = req.params;
      const { title, description, targetAmount, deadline, recipient } = req.body;

      const updates: Record<string, unknown> = {};
      if (title !== undefined) updates.title = title;
      if (description !== undefined) updates.description = description;
      if (targetAmount !== undefined) updates.targetAmount = targetAmount;
      if (deadline !== undefined) updates.deadline = deadline;
      if (recipient !== undefined) updates.recipient = recipient;

      const goal = goalsService.updateGoal(id, updates);
      if (!goal) {
        res.status(404).json({ error: 'Goal not found' });
        return;
      }

      res.json({ goal });
    } catch (err) {
      logger.error('Failed to update goal', { error: String(err) });
      res.status(500).json({ error: 'Failed to update goal' });
    }
  });

  /** DELETE /api/goals/:id — Delete a goal */
  router.delete('/goals/:id', (req, res) => {
    try {
      const { id } = req.params;
      const deleted = goalsService.deleteGoal(id);
      if (!deleted) {
        res.status(404).json({ error: 'Goal not found' });
        return;
      }
      res.json({ success: true });
    } catch (err) {
      logger.error('Failed to delete goal', { error: String(err) });
      res.status(500).json({ error: 'Failed to delete goal' });
    }
  });
}
