import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { logger } from '../utils/logger.js';

/** An address tag — custom label for a wallet address */
export interface AddressTag {
  address: string;
  label: string;
  color?: string;
  createdAt: string;
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const TAGS_FILE = join(__dirname, '..', '..', '.tags.json');

/**
 * TagsService — lets users tag addresses with custom labels and colors.
 * Persisted to .tags.json file, keyed by lowercase address.
 */
export class TagsService {
  private tags: Map<string, AddressTag> = new Map();

  constructor() {
    this.load();
  }

  /** Add or update a tag for an address */
  addTag(address: string, label: string, color?: string): AddressTag {
    const key = address.toLowerCase();
    const tag: AddressTag = {
      address,
      label,
      color: color || '#10b981',
      createdAt: new Date().toISOString(),
    };
    this.tags.set(key, tag);
    this.save();
    logger.info('Tag added', { address, label, color: tag.color });
    return tag;
  }

  /** Get all tags */
  getTags(): AddressTag[] {
    return Array.from(this.tags.values());
  }

  /** Get tag for a specific address */
  getTag(address: string): AddressTag | null {
    return this.tags.get(address.toLowerCase()) || null;
  }

  /** Delete tag for an address */
  deleteTag(address: string): boolean {
    const key = address.toLowerCase();
    const deleted = this.tags.delete(key);
    if (deleted) {
      this.save();
      logger.info('Tag deleted', { address });
    }
    return deleted;
  }

  /** Load tags from disk */
  private load(): void {
    try {
      if (existsSync(TAGS_FILE)) {
        const data = JSON.parse(readFileSync(TAGS_FILE, 'utf-8')) as AddressTag[];
        for (const tag of data) {
          this.tags.set(tag.address.toLowerCase(), tag);
        }
        logger.info(`Loaded ${this.tags.size} tags from disk`);
      }
    } catch (err) {
      logger.warn('Failed to load tags file', { error: String(err) });
    }
  }

  /** Persist tags to disk */
  private save(): void {
    try {
      const data = Array.from(this.tags.values());
      writeFileSync(TAGS_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      logger.warn('Failed to save tags file', { error: String(err) });
    }
  }
}
