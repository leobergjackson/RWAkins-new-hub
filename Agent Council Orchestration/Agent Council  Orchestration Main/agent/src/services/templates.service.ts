import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger.js';
import type { TipTemplate } from '../types/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATES_FILE = join(__dirname, '..', '..', '.templates.json');

/**
 * TemplatesService — in-memory tip templates with JSON file persistence.
 */
export class TemplatesService {
  private templates: Map<string, TipTemplate> = new Map();

  constructor() {
    this.load();
  }

  /** Add a new template */
  addTemplate(template: Omit<TipTemplate, 'id' | 'createdAt'>): TipTemplate {
    const full: TipTemplate = {
      ...template,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
    };

    this.templates.set(full.id, full);
    this.save();
    logger.info('Template added', { id: full.id, name: full.name });
    return full;
  }

  /** Get all templates sorted by creation date (newest first) */
  getTemplates(): TipTemplate[] {
    return Array.from(this.templates.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  /** Get a single template by ID */
  getTemplate(id: string): TipTemplate | undefined {
    return this.templates.get(id);
  }

  /** Delete a template by ID */
  deleteTemplate(id: string): boolean {
    const deleted = this.templates.delete(id);
    if (deleted) {
      this.save();
      logger.info('Template deleted', { id });
    }
    return deleted;
  }

  /** Load templates from disk */
  private load(): void {
    try {
      if (existsSync(TEMPLATES_FILE)) {
        const data = JSON.parse(readFileSync(TEMPLATES_FILE, 'utf-8')) as TipTemplate[];
        for (const t of data) {
          this.templates.set(t.id, t);
        }
        logger.info(`Loaded ${this.templates.size} templates from disk`);
      }
    } catch (err) {
      logger.warn('Failed to load templates file', { error: String(err) });
    }
  }

  /** Persist templates to disk */
  private save(): void {
    try {
      const data = Array.from(this.templates.values());
      writeFileSync(TEMPLATES_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      logger.warn('Failed to save templates file', { error: String(err) });
    }
  }
}
