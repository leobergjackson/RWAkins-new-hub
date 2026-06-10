/**
 * TemplatesService — tip template CRUD operations.
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { TemplatesService } from '../services/templates.service.js';

describe('TemplatesService', () => {
  let service: TemplatesService;

  before(() => {
    service = new TemplatesService();
  });

  it('addTemplate creates a template with id and timestamp', () => {
    const tpl = service.addTemplate({
      name: 'Quick Tip',
      recipient: '0xRecipient001',
      amount: '0.01',
      token: 'native' as const,
    });
    assert.ok(tpl.id);
    assert.equal(tpl.name, 'Quick Tip');
    assert.equal(tpl.amount, '0.01');
    assert.ok(tpl.createdAt);
  });

  it('getTemplates returns all templates', () => {
    const templates = service.getTemplates();
    assert.ok(Array.isArray(templates));
    assert.ok(templates.length >= 1);
  });

  it('getTemplate retrieves by id', () => {
    const created = service.addTemplate({
      name: 'Lookup Template',
      recipient: '0xRecipient002',
      amount: '0.5',
      token: 'usdt' as const,
    });
    const found = service.getTemplate(created.id);
    assert.ok(found);
    assert.equal(found!.name, 'Lookup Template');
  });

  it('getTemplate returns undefined for nonexistent id', () => {
    const result = service.getTemplate('nonexistent');
    assert.equal(result, undefined);
  });

  it('deleteTemplate removes a template', () => {
    const created = service.addTemplate({
      name: 'Delete Me',
      recipient: '0xDelete',
      amount: '1',
      token: 'native' as const,
    });
    const deleted = service.deleteTemplate(created.id);
    assert.equal(deleted, true);
    assert.equal(service.getTemplate(created.id), undefined);
  });

  it('deleteTemplate returns false for nonexistent id', () => {
    const result = service.deleteTemplate('nonexistent');
    assert.equal(result, false);
  });
});
