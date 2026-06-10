import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const GOALS_FILE = join(__dirname, '..', '..', '.goals.json');

/** A fundraising/tipping goal */
export interface TipGoal {
  id: string;
  title: string;
  description: string;
  targetAmount: number;
  currentAmount: number;
  token: string;
  recipient?: string;
  deadline?: string;
  createdAt: string;
  completed: boolean;
}

/**
 * GoalsService — manage fundraising/tipping goals with JSON file persistence.
 */
export class GoalsService {
  private goals: Map<string, TipGoal> = new Map();

  constructor() {
    this.load();
  }

  /** Create a new goal */
  createGoal(input: {
    title: string;
    description?: string;
    targetAmount: number;
    token: string;
    recipient?: string;
    deadline?: string;
  }): TipGoal {
    const goal: TipGoal = {
      id: uuidv4(),
      title: input.title,
      description: input.description ?? '',
      targetAmount: input.targetAmount,
      currentAmount: 0,
      token: input.token,
      recipient: input.recipient,
      deadline: input.deadline,
      createdAt: new Date().toISOString(),
      completed: false,
    };

    this.goals.set(goal.id, goal);
    this.save();
    logger.info('Goal created', { id: goal.id, title: goal.title, target: goal.targetAmount });
    return goal;
  }

  /** Get all goals, newest first */
  getGoals(): TipGoal[] {
    return Array.from(this.goals.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  /** Get a single goal by ID */
  getGoal(id: string): TipGoal | undefined {
    return this.goals.get(id);
  }

  /** Update a goal's fields (title, description, targetAmount, deadline) */
  updateGoal(id: string, updates: Partial<Pick<TipGoal, 'title' | 'description' | 'targetAmount' | 'deadline' | 'recipient'>>): TipGoal | null {
    const goal = this.goals.get(id);
    if (!goal) return null;

    if (updates.title !== undefined) goal.title = updates.title;
    if (updates.description !== undefined) goal.description = updates.description;
    if (updates.targetAmount !== undefined) goal.targetAmount = updates.targetAmount;
    if (updates.deadline !== undefined) goal.deadline = updates.deadline;
    if (updates.recipient !== undefined) goal.recipient = updates.recipient;

    // Re-check completion
    goal.completed = goal.currentAmount >= goal.targetAmount;

    this.save();
    logger.info('Goal updated', { id, ...updates });
    return goal;
  }

  /**
   * Update goal progress when a tip is sent.
   * Matches goals by recipient address (case-insensitive) and token.
   * Returns list of goals that were updated.
   */
  updateGoalProgress(recipient: string, amount: number, token: string): TipGoal[] {
    const updated: TipGoal[] = [];

    for (const goal of this.goals.values()) {
      if (goal.completed) continue;

      // Match by recipient if goal has one set
      const recipientMatch = !goal.recipient ||
        goal.recipient.toLowerCase() === recipient.toLowerCase();

      // Match by token (native vs usdt)
      const tokenMatch = goal.token === token || goal.token === 'any';

      if (recipientMatch && tokenMatch) {
        goal.currentAmount = Math.round((goal.currentAmount + amount) * 1e8) / 1e8;
        if (goal.currentAmount >= goal.targetAmount) {
          goal.completed = true;
          logger.info('Goal completed!', { id: goal.id, title: goal.title });
        }
        updated.push(goal);
      }
    }

    if (updated.length > 0) {
      this.save();
      logger.info('Goal progress updated', {
        goalsUpdated: updated.length,
        recipient,
        amount,
        token,
      });
    }

    return updated;
  }

  /** Delete a goal by ID */
  deleteGoal(id: string): boolean {
    const deleted = this.goals.delete(id);
    if (deleted) {
      this.save();
      logger.info('Goal deleted', { id });
    }
    return deleted;
  }

  /** Load goals from disk */
  private load(): void {
    try {
      if (existsSync(GOALS_FILE)) {
        const data = JSON.parse(readFileSync(GOALS_FILE, 'utf-8')) as TipGoal[];
        for (const g of data) {
          this.goals.set(g.id, g);
        }
        logger.info(`Loaded ${this.goals.size} goals from disk`);
      }
    } catch (err) {
      logger.warn('Failed to load goals file', { error: String(err) });
    }
  }

  /** Persist goals to disk */
  private save(): void {
    try {
      const data = Array.from(this.goals.values());
      writeFileSync(GOALS_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      logger.warn('Failed to save goals file', { error: String(err) });
    }
  }
}
