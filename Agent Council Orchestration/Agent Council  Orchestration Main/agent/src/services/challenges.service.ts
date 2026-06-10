import { logger } from '../utils/logger.js';

/** Challenge event types that can trigger progress updates */
export type ChallengeEventType =
  | 'tip_sent'
  | 'tip_sent_chain'   // includes chainId in metadata
  | 'nlp_tip'
  | 'daily_complete';

/** A gamified challenge with progress tracking */
export interface Challenge {
  id: string;
  title: string;
  description: string;
  type: 'daily' | 'weekly';
  target: number;
  progress: number;
  reward: string;
  expiresAt: string;
  completed: boolean;
  icon: string;
}

/** Streak tracking data */
export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastTipDate: string | null;
  streakMilestones: Array<{
    days: number;
    icon: string;
    label: string;
    reached: boolean;
  }>;
}

interface ChallengeDefinition {
  titleTemplate: string;
  description: string;
  target: number;
  reward: string;
  icon: string;
  eventType: ChallengeEventType;
}

const DAILY_CHALLENGE_DEFS: ChallengeDefinition[] = [
  {
    titleTemplate: 'Send 3 tips today',
    description: 'Send 3 tips to any recipients today',
    target: 3,
    reward: 'Generous Tipper badge',
    icon: '\uD83D\uDCB8',
    eventType: 'tip_sent',
  },
  {
    titleTemplate: 'Tip on 2 different chains',
    description: 'Send tips on at least 2 different blockchain networks',
    target: 2,
    reward: 'Chain Hopper badge',
    icon: '\uD83D\uDD17',
    eventType: 'tip_sent_chain',
  },
  {
    titleTemplate: 'Use NLP to send a tip',
    description: 'Send a tip using natural language input',
    target: 1,
    reward: 'AI Whisperer badge',
    icon: '\uD83E\uDDE0',
    eventType: 'nlp_tip',
  },
];

const WEEKLY_CHALLENGE_DEFS: ChallengeDefinition[] = [
  {
    titleTemplate: 'Send 10 tips this week',
    description: 'Send a total of 10 tips throughout the week',
    target: 10,
    reward: 'Weekly Warrior badge',
    icon: '\uD83C\uDFC6',
    eventType: 'tip_sent',
  },
  {
    titleTemplate: 'Tip 5 unique recipients',
    description: 'Send tips to 5 different wallet addresses this week',
    target: 5,
    reward: 'Social Butterfly badge',
    icon: '\uD83E\uDD8B',
    eventType: 'tip_sent',
  },
  {
    titleTemplate: 'Complete all daily challenges',
    description: 'Complete every daily challenge at least once this week',
    target: 3,
    reward: 'Completionist badge',
    icon: '\u2B50',
    eventType: 'daily_complete',
  },
];

/**
 * ChallengesService — manages gamified daily/weekly challenges and tip streaks.
 *
 * All state is kept in memory. Daily challenges reset at midnight UTC.
 * Weekly challenges reset on Monday midnight UTC.
 */
export class ChallengesService {
  private dailyChallenges: Challenge[] = [];
  private weeklyChallenges: Challenge[] = [];
  private dailyResetDate: string = '';
  private weeklyResetDate: string = '';

  // Streak tracking
  private lastTipDate: string | null = null;
  private currentStreak: number = 0;
  private longestStreak: number = 0;

  // Tracking for unique-chain and unique-recipient challenges
  private dailyChainsSeen: Set<string> = new Set();
  private weeklyRecipientsSeen: Set<string> = new Set();
  private weeklyDailiesCompleted: Set<string> = new Set();

  constructor() {
    this.initChallenges();
  }

  /** Initialize or refresh challenges if dates have rolled over */
  private initChallenges(): void {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const mondayStr = this.getWeekStart(now);

    if (this.dailyResetDate !== todayStr) {
      this.resetDailyChallengesInternal(now);
    }
    if (this.weeklyResetDate !== mondayStr) {
      this.resetWeeklyChallengesInternal(now);
    }
  }

  /** Get the Monday of the current week as YYYY-MM-DD */
  private getWeekStart(date: Date): string {
    const d = new Date(date);
    const day = d.getUTCDay();
    const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1);
    d.setUTCDate(diff);
    return d.toISOString().slice(0, 10);
  }

  /** Create daily challenges for today */
  private resetDailyChallengesInternal(now: Date): void {
    const todayStr = now.toISOString().slice(0, 10);
    const endOfDay = new Date(now);
    endOfDay.setUTCHours(23, 59, 59, 999);

    this.dailyChallenges = DAILY_CHALLENGE_DEFS.map((def) => ({
      id: `daily-${def.eventType}-${todayStr}`,
      title: def.titleTemplate,
      description: def.description,
      type: 'daily' as const,
      target: def.target,
      progress: 0,
      reward: def.reward,
      expiresAt: endOfDay.toISOString(),
      completed: false,
      icon: def.icon,
    }));

    this.dailyResetDate = todayStr;
    this.dailyChainsSeen.clear();
    logger.info('Daily challenges reset', { date: todayStr });
  }

  /** Create weekly challenges */
  private resetWeeklyChallengesInternal(now: Date): void {
    const mondayStr = this.getWeekStart(now);
    const endOfWeek = new Date(now);
    const daysUntilSunday = 7 - endOfWeek.getUTCDay();
    endOfWeek.setUTCDate(endOfWeek.getUTCDate() + (endOfWeek.getUTCDay() === 0 ? 0 : daysUntilSunday));
    endOfWeek.setUTCHours(23, 59, 59, 999);

    this.weeklyChallenges = WEEKLY_CHALLENGE_DEFS.map((def, idx) => ({
      id: `weekly-${idx}-${mondayStr}`,
      title: def.titleTemplate,
      description: def.description,
      type: 'weekly' as const,
      target: def.target,
      progress: 0,
      reward: def.reward,
      expiresAt: endOfWeek.toISOString(),
      completed: false,
      icon: def.icon,
    }));

    this.weeklyResetDate = mondayStr;
    this.weeklyRecipientsSeen.clear();
    this.weeklyDailiesCompleted.clear();
    logger.info('Weekly challenges reset', { week: mondayStr });
  }

  /** Get all active challenges with current progress */
  getChallenges(): { daily: Challenge[]; weekly: Challenge[] } {
    this.initChallenges(); // auto-reset if date rolled over
    return {
      daily: this.dailyChallenges.map((c) => ({ ...c })),
      weekly: this.weeklyChallenges.map((c) => ({ ...c })),
    };
  }

  /** Manually reset daily challenges */
  resetDailyChallenges(): void {
    this.resetDailyChallengesInternal(new Date());
  }

  /** Get streak data */
  getStreakData(): StreakData {
    // Check if streak should be broken (missed yesterday)
    this.checkStreakContinuity();

    const milestones = [
      { days: 3, icon: '\uD83D\uDD25', label: 'On Fire', reached: this.longestStreak >= 3 },
      { days: 7, icon: '\u26A1', label: 'Lightning Week', reached: this.longestStreak >= 7 },
      { days: 14, icon: '\uD83D\uDCAA', label: 'Two Week Warrior', reached: this.longestStreak >= 14 },
      { days: 30, icon: '\uD83C\uDFC6', label: 'Monthly Master', reached: this.longestStreak >= 30 },
    ];

    return {
      currentStreak: this.currentStreak,
      longestStreak: this.longestStreak,
      lastTipDate: this.lastTipDate,
      streakMilestones: milestones,
    };
  }

  /** Check if the streak is still valid (didn't miss a day) */
  private checkStreakContinuity(): void {
    if (!this.lastTipDate) return;
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

    if (this.lastTipDate !== today && this.lastTipDate !== yesterday) {
      // Streak broken — missed at least one full day
      this.currentStreak = 0;
    }
  }

  /**
   * Update challenge progress based on a tip event.
   * Call this after a successful tip execution.
   */
  updateProgress(eventType: ChallengeEventType, metadata?: { chainId?: string; recipient?: string; usedNlp?: boolean }): void {
    this.initChallenges();

    // Update streak on tip_sent
    if (eventType === 'tip_sent' || eventType === 'tip_sent_chain') {
      this.updateStreak();
    }

    // --- Daily challenges ---
    if (eventType === 'tip_sent') {
      // "Send 3 tips today"
      const tipChallenge = this.dailyChallenges.find((c) => c.id.includes('daily-tip_sent'));
      if (tipChallenge && !tipChallenge.completed) {
        tipChallenge.progress = Math.min(tipChallenge.progress + 1, tipChallenge.target);
        if (tipChallenge.progress >= tipChallenge.target) {
          tipChallenge.completed = true;
          this.onDailyCompleted(tipChallenge.id);
        }
      }
    }

    if (eventType === 'tip_sent_chain' && metadata?.chainId) {
      // "Tip on 2 different chains"
      this.dailyChainsSeen.add(metadata.chainId);
      const chainChallenge = this.dailyChallenges.find((c) => c.id.includes('daily-tip_sent_chain'));
      if (chainChallenge && !chainChallenge.completed) {
        chainChallenge.progress = Math.min(this.dailyChainsSeen.size, chainChallenge.target);
        if (chainChallenge.progress >= chainChallenge.target) {
          chainChallenge.completed = true;
          this.onDailyCompleted(chainChallenge.id);
        }
      }
    }

    if (eventType === 'nlp_tip') {
      // "Use NLP to send a tip"
      const nlpChallenge = this.dailyChallenges.find((c) => c.id.includes('daily-nlp_tip'));
      if (nlpChallenge && !nlpChallenge.completed) {
        nlpChallenge.progress = 1;
        nlpChallenge.completed = true;
        this.onDailyCompleted(nlpChallenge.id);
      }
    }

    // --- Weekly challenges ---
    if (eventType === 'tip_sent') {
      // "Send 10 tips this week"
      const weeklyTip = this.weeklyChallenges.find((c) => c.id.includes('weekly-0'));
      if (weeklyTip && !weeklyTip.completed) {
        weeklyTip.progress = Math.min(weeklyTip.progress + 1, weeklyTip.target);
        if (weeklyTip.progress >= weeklyTip.target) {
          weeklyTip.completed = true;
        }
      }

      // "Tip 5 unique recipients"
      if (metadata?.recipient) {
        this.weeklyRecipientsSeen.add(metadata.recipient);
        const recipientChallenge = this.weeklyChallenges.find((c) => c.id.includes('weekly-1'));
        if (recipientChallenge && !recipientChallenge.completed) {
          recipientChallenge.progress = Math.min(this.weeklyRecipientsSeen.size, recipientChallenge.target);
          if (recipientChallenge.progress >= recipientChallenge.target) {
            recipientChallenge.completed = true;
          }
        }
      }
    }

    logger.debug('Challenge progress updated', { eventType, metadata });
  }

  /** When a daily challenge is completed, update the weekly "complete all dailies" challenge */
  private onDailyCompleted(challengeId: string): void {
    this.weeklyDailiesCompleted.add(challengeId.replace(/-\d{4}-\d{2}-\d{2}$/, ''));
    const completionChallenge = this.weeklyChallenges.find((c) => c.id.includes('weekly-2'));
    if (completionChallenge && !completionChallenge.completed) {
      completionChallenge.progress = Math.min(this.weeklyDailiesCompleted.size, completionChallenge.target);
      if (completionChallenge.progress >= completionChallenge.target) {
        completionChallenge.completed = true;
      }
    }
  }

  /** Update the tip streak */
  private updateStreak(): void {
    const today = new Date().toISOString().slice(0, 10);

    if (this.lastTipDate === today) {
      // Already tipped today, no change
      return;
    }

    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

    if (!this.lastTipDate || this.lastTipDate === yesterday) {
      // Continue or start streak
      this.currentStreak += 1;
    } else {
      // Streak was broken, start fresh
      this.currentStreak = 1;
    }

    this.lastTipDate = today;

    if (this.currentStreak > this.longestStreak) {
      this.longestStreak = this.currentStreak;
    }

    logger.info('Streak updated', {
      current: this.currentStreak,
      longest: this.longestStreak,
    });
  }
}
