// Copyright 2026 AeroFyta. Licensed under Apache 2.0.

import { logger } from '../utils/logger.js';

/** Available agent personality styles */
export type PersonalityType = 'professional' | 'friendly' | 'pirate' | 'emoji' | 'minimal';

/** Message types the personality system can format */
export type MessageType = 'greeting' | 'tip_confirmed' | 'tip_failed' | 'balance_report' | 'fee_comparison' | 'help' | 'unknown_intent';

/** A single personality definition with all templates */
export interface PersonalityDefinition {
  id: PersonalityType;
  name: string;
  description: string;
  templates: Record<MessageType, string>;
}

/** All available personalities */
const PERSONALITIES: Record<PersonalityType, PersonalityDefinition> = {
  professional: {
    id: 'professional',
    name: 'Professional',
    description: 'Formal and business-like communication',
    templates: {
      greeting: 'Welcome to AeroFyta. How may I assist you today?',
      tip_confirmed: 'Transaction confirmed. {{amount}} {{currency}} has been transferred to {{recipient}} on {{chain}}. Transaction hash: {{txHash}}.',
      tip_failed: 'Transaction unsuccessful: {{error}}. Please verify your balance and retry.',
      balance_report: 'Current account balances:\n\n{{balances}}',
      fee_comparison: 'Fee analysis for a {{amount}} transfer:\n\n{{fees}}\n\nRecommendation: {{cheapest}} offers the lowest cost at ~${{cheapestFee}}.',
      help: 'AeroFyta Agent — Available Commands:\n\n- Send tips: "send 0.01 ETH to 0x1234..."\n- Check balances: "what is my balance?"\n- Compare fees: "which chain is cheapest?"\n- View addresses: "show my wallet address"\n- Tip history: "show my recent tips"\n- USDT tips: "tip 5 USDT to 0x1234..."\n\nI support Ethereum Sepolia and TON Testnet with automatic chain optimization.',
      unknown_intent: 'I did not understand that request. Available commands include sending tips, checking balances, comparing fees, and viewing addresses. Type "help" for full details.',
    },
  },

  friendly: {
    id: 'friendly',
    name: 'Friendly',
    description: 'Warm and casual conversation style',
    templates: {
      greeting: 'Hey there! Great to see you! What can I help you with today?',
      tip_confirmed: 'Awesome, tip sent! {{amount}} {{currency}} is on its way to {{recipient}} via {{chain}}. Here\'s your tx: {{txHash}}. Nice one!',
      tip_failed: 'Oh no, that didn\'t work: {{error}}. Let\'s check your balance and try again!',
      balance_report: 'Here\'s what you\'ve got:\n\n{{balances}}\n\nLooking good!',
      fee_comparison: 'Let me check the fees for you on a {{amount}} transfer:\n\n{{fees}}\n\nYour best bet is {{cheapest}} at just ~${{cheapestFee}}!',
      help: 'Hey! I\'m AeroFyta, your tipping buddy! Here\'s what I can do:\n\n- Send tips: "send 0.01 ETH to 0x1234..."\n- Check balances: "what\'s my balance?"\n- Compare fees: "which chain is cheapest?"\n- View addresses: "show my wallet address"\n- Tip history: "show my recent tips"\n- USDT tips: "tip 5 USDT to 0x1234..."\n\nI\'ll pick the best chain for you automatically!',
      unknown_intent: 'Hmm, I\'m not quite sure what you mean! Try asking me to send a tip, check your balance, or compare fees. Say "help" if you need more info!',
    },
  },

  pirate: {
    id: 'pirate',
    name: 'Pirate',
    description: 'Arr! Talk like a pirate',
    templates: {
      greeting: 'Ahoy, matey! Welcome aboard the AeroFyta vessel! What treasure shall we move today?',
      tip_confirmed: 'Arr! The treasure be delivered! {{amount}} {{currency}} sailed to {{recipient}} across the {{chain}} seas. Yer transaction scroll: {{txHash}}. Yo ho ho!',
      tip_failed: 'Blimey! The transfer hit a reef: {{error}}. Check yer treasure chest and try again, ye scallywag!',
      balance_report: 'Yer treasure chest holds:\n\n{{balances}}\n\nA fine bounty, captain!',
      fee_comparison: 'I\'ve scouted the seas for a {{amount}} transfer:\n\n{{fees}}\n\nThe cheapest waters be {{cheapest}} at ~${{cheapestFee}} doubloons!',
      help: 'Ahoy! I be AeroFyta, yer tipping first mate! Here be me skills:\n\n- Send treasure: "send 0.01 ETH to 0x1234..."\n- Check the chest: "what\'s my balance?"\n- Scout the seas: "which chain is cheapest?"\n- View the map: "show my wallet address"\n- Plunder log: "show my recent tips"\n- USDT bounty: "tip 5 USDT to 0x1234..."\n\nI\'ll navigate the best route for yer treasure, arr!',
      unknown_intent: 'Arr, I can\'t make heads or tails of that, matey! Try askin\' me to send treasure, check yer chest, or scout the fees. Say "help" for the full map!',
    },
  },

  emoji: {
    id: 'emoji',
    name: 'Emoji',
    description: 'Expressive with lots of emoji',
    templates: {
      greeting: 'Hi! Welcome to AeroFyta! What can I do for you today?',
      tip_confirmed: 'Tip sent! {{amount}} {{currency}} to {{recipient}} on {{chain}}! TX: {{txHash}}',
      tip_failed: 'Oh no! Failed: {{error}}. Check your balance and try again!',
      balance_report: 'Your balances:\n\n{{balances}}',
      fee_comparison: 'Fee check for {{amount}} transfer:\n\n{{fees}}\n\nBest deal: {{cheapest}} at ~${{cheapestFee}}!',
      help: 'I\'m AeroFyta! Here\'s what I can do:\n\n- Send tips: "send 0.01 ETH to 0x1234..."\n- Check balances: "what\'s my balance?"\n- Compare fees: "which chain is cheapest?"\n- View addresses: "show my wallet address"\n- Tip history: "show my recent tips"\n- USDT tips: "tip 5 USDT to 0x1234..."\n\nAuto chain selection included!',
      unknown_intent: 'Hmm, not sure what you mean! Try sending a tip, checking balance, or comparing fees. Say "help" for more!',
    },
  },

  minimal: {
    id: 'minimal',
    name: 'Minimal',
    description: 'Short and concise responses',
    templates: {
      greeting: 'AeroFyta ready. How can I help?',
      tip_confirmed: 'Sent {{amount}} {{currency}} to {{recipient}} on {{chain}}. TX: {{txHash}}',
      tip_failed: 'Failed: {{error}}',
      balance_report: '{{balances}}',
      fee_comparison: '{{fees}}\nCheapest: {{cheapest}} (~${{cheapestFee}})',
      help: 'Commands: send tips, check balance, compare fees, view addresses, tip history.',
      unknown_intent: 'Unknown command. Try "help".',
    },
  },
};

/**
 * PersonalityService — manages agent communication style.
 *
 * Stores the active personality in memory and formats messages
 * using personality-specific templates with variable interpolation.
 */
export class PersonalityService {
  private activePersonality: PersonalityType = 'friendly';

  constructor(initial?: PersonalityType) {
    if (initial && initial in PERSONALITIES) {
      this.activePersonality = initial;
    }
  }

  /** Get the current active personality type */
  getActivePersonality(): PersonalityType {
    return this.activePersonality;
  }

  /** Get the full definition of the active personality */
  getActiveDefinition(): PersonalityDefinition {
    return PERSONALITIES[this.activePersonality];
  }

  /** Set the active personality */
  setPersonality(type: PersonalityType): boolean {
    if (!(type in PERSONALITIES)) {
      logger.warn('Invalid personality type', { type });
      return false;
    }
    this.activePersonality = type;
    logger.info('Personality changed', { personality: type });
    return true;
  }

  /** Get all available personalities */
  getPersonalities(): PersonalityDefinition[] {
    return Object.values(PERSONALITIES);
  }

  /** Get a specific personality definition by type */
  getPersonality(type: PersonalityType): PersonalityDefinition | undefined {
    return PERSONALITIES[type];
  }

  /**
   * Format a message using the active personality's template.
   * Variables in the template are replaced using {{key}} syntax.
   */
  formatMessage(type: MessageType, data?: Record<string, string>): string {
    const personality = PERSONALITIES[this.activePersonality];
    let template = personality.templates[type];

    if (!template) {
      logger.warn('Missing template', { personality: this.activePersonality, messageType: type });
      return data?.['fallback'] ?? '';
    }

    if (data) {
      for (const [key, value] of Object.entries(data)) {
        template = template.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
      }
    }

    return template;
  }
}
