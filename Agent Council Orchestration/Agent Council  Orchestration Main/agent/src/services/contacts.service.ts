import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger.js';
import type { Contact, ChainId } from '../types/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONTACTS_FILE = join(__dirname, '..', '..', '.contacts.json');

/**
 * ContactsService — in-memory address book with JSON file persistence.
 */
export class ContactsService {
  private contacts: Map<string, Contact> = new Map();

  constructor() {
    this.load();
  }

  /** Add a new contact */
  addContact(name: string, address: string, chain?: ChainId, group?: string): Contact {
    // Check for duplicate address
    for (const c of this.contacts.values()) {
      if (c.address.toLowerCase() === address.toLowerCase()) {
        // Update existing contact name if different
        c.name = name;
        if (chain) c.chain = chain;
        if (group !== undefined) c.group = group;
        this.save();
        return c;
      }
    }

    const contact: Contact = {
      id: uuidv4(),
      name,
      address,
      chain,
      group,
      tipCount: 0,
    };

    this.contacts.set(contact.id, contact);
    this.save();
    logger.info('Contact added', { id: contact.id, name, address, group });
    return contact;
  }

  /** Get all contacts sorted by tipCount descending */
  getContacts(): Contact[] {
    return Array.from(this.contacts.values()).sort((a, b) => b.tipCount - a.tipCount);
  }

  /** Update a contact's name and/or group */
  updateContact(id: string, updates: { name?: string; group?: string }): Contact | null {
    const contact = this.contacts.get(id);
    if (!contact) return null;
    if (updates.name !== undefined) contact.name = updates.name;
    if (updates.group !== undefined) contact.group = updates.group || undefined;
    this.save();
    logger.info('Contact updated', { id, ...updates });
    return contact;
  }

  /** Get contacts filtered by group */
  getContactsByGroup(group: string): Contact[] {
    return Array.from(this.contacts.values())
      .filter((c) => c.group === group)
      .sort((a, b) => b.tipCount - a.tipCount);
  }

  /** Get all unique group names */
  getGroups(): string[] {
    const groups = new Set<string>();
    for (const c of this.contacts.values()) {
      if (c.group) groups.add(c.group);
    }
    return Array.from(groups).sort();
  }

  /** Export all contacts as a plain array */
  exportContacts(): Contact[] {
    return Array.from(this.contacts.values());
  }

  /** Import contacts from an array, skipping duplicates by address */
  importContacts(incoming: Array<{ name: string; address: string; chain?: ChainId; group?: string }>): { added: number; skipped: number; errors: string[] } {
    const result = { added: 0, skipped: 0, errors: [] as string[] };
    for (const item of incoming) {
      if (!item.name || typeof item.name !== 'string') {
        result.errors.push(`Missing name for address ${item.address ?? 'unknown'}`);
        continue;
      }
      if (!item.address || typeof item.address !== 'string' || item.address.length < 10) {
        result.errors.push(`Invalid address for contact "${item.name}"`);
        continue;
      }
      // Check duplicate
      let isDuplicate = false;
      for (const c of this.contacts.values()) {
        if (c.address.toLowerCase() === item.address.toLowerCase()) {
          isDuplicate = true;
          break;
        }
      }
      if (isDuplicate) {
        result.skipped++;
        continue;
      }
      const contact: Contact = {
        id: uuidv4(),
        name: item.name,
        address: item.address,
        chain: item.chain,
        group: item.group,
        tipCount: 0,
      };
      this.contacts.set(contact.id, contact);
      result.added++;
    }
    if (result.added > 0) this.save();
    logger.info('Contacts imported', result);
    return result;
  }

  /** Delete a contact by ID */
  deleteContact(id: string): boolean {
    const deleted = this.contacts.delete(id);
    if (deleted) {
      this.save();
      logger.info('Contact deleted', { id });
    }
    return deleted;
  }

  /** Increment tip count for an address (called after successful tip) */
  incrementTipCount(address: string): void {
    for (const c of this.contacts.values()) {
      if (c.address.toLowerCase() === address.toLowerCase()) {
        c.tipCount++;
        c.lastTipped = new Date().toISOString();
        this.save();
        return;
      }
    }
  }

  /** Load contacts from disk */
  private load(): void {
    try {
      if (existsSync(CONTACTS_FILE)) {
        const data = JSON.parse(readFileSync(CONTACTS_FILE, 'utf-8')) as Contact[];
        for (const c of data) {
          this.contacts.set(c.id, c);
        }
        logger.info(`Loaded ${this.contacts.size} contacts from disk`);
      }
    } catch (err) {
      logger.warn('Failed to load contacts file', { error: String(err) });
    }
  }

  /** Persist contacts to disk */
  private save(): void {
    try {
      const data = Array.from(this.contacts.values());
      writeFileSync(CONTACTS_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      logger.warn('Failed to save contacts file', { error: String(err) });
    }
  }
}
