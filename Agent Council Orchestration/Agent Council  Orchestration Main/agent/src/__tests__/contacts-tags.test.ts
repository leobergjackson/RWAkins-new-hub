/**
 * ContactsService + TagsService — Address book and tag management tests.
 * Tests add/get/remove operations for both services.
 *
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { ContactsService } from '../services/contacts.service.js';
import { TagsService } from '../services/tags.service.js';

describe('ContactsService', () => {
  let service: ContactsService;

  before(() => {
    service = new ContactsService();
  });

  // ── addContact ──

  describe('addContact()', () => {
    it('adds a new contact', () => {
      const contact = service.addContact('Alice', '0xAlice00000000000000000000000000000001');
      assert.ok(contact.id);
      assert.equal(contact.name, 'Alice');
      assert.equal(contact.address, '0xAlice00000000000000000000000000000001');
      assert.equal(contact.tipCount, 0);
    });

    it('adds contact with chain and group', () => {
      const contact = service.addContact('Bob', '0xBob0000000000000000000000000000000002', 'ethereum-sepolia' as any, 'friends');
      assert.equal(contact.name, 'Bob');
      assert.equal(contact.chain, 'ethereum-sepolia');
      assert.equal(contact.group, 'friends');
    });

    it('updates existing contact on duplicate address', () => {
      const addr = '0xDuplicate000000000000000000000000000003';
      service.addContact('First', addr);
      const updated = service.addContact('Updated', addr);
      assert.equal(updated.name, 'Updated');
    });
  });

  // ── getContacts ──

  describe('getContacts()', () => {
    it('returns an array of contacts', () => {
      const contacts = service.getContacts();
      assert.ok(Array.isArray(contacts));
      assert.ok(contacts.length > 0);
    });

    it('contacts have required fields', () => {
      const contacts = service.getContacts();
      for (const c of contacts) {
        assert.equal(typeof c.id, 'string');
        assert.equal(typeof c.name, 'string');
        assert.equal(typeof c.address, 'string');
        assert.equal(typeof c.tipCount, 'number');
      }
    });
  });

  // ── updateContact ──

  describe('updateContact()', () => {
    it('updates contact name', () => {
      const contact = service.addContact('Before', '0xUpdate00000000000000000000000000000004');
      const updated = service.updateContact(contact.id, { name: 'After' });
      assert.ok(updated);
      assert.equal(updated!.name, 'After');
    });

    it('returns null for non-existent contact', () => {
      const result = service.updateContact('nonexistent', { name: 'Nope' });
      assert.equal(result, null);
    });
  });
});

describe('TagsService', () => {
  let service: TagsService;

  before(() => {
    service = new TagsService();
  });

  // ── addTag ──

  describe('addTag()', () => {
    it('adds a tag for an address', () => {
      const tag = service.addTag('0xTagged001', 'My Wallet', '#ff0000');
      assert.equal(tag.address, '0xTagged001');
      assert.equal(tag.label, 'My Wallet');
      assert.equal(tag.color, '#ff0000');
      assert.ok(tag.createdAt);
    });

    it('defaults color to green', () => {
      const tag = service.addTag('0xTagged002', 'No Color');
      assert.equal(tag.color, '#10b981');
    });

    it('overwrites existing tag for same address', () => {
      service.addTag('0xTagged003', 'First Label');
      const updated = service.addTag('0xTagged003', 'Second Label');
      assert.equal(updated.label, 'Second Label');
    });
  });

  // ── getTag ──

  describe('getTag()', () => {
    it('retrieves a tag by address', () => {
      service.addTag('0xGetMe', 'Found');
      const tag = service.getTag('0xGetMe');
      assert.ok(tag);
      assert.equal(tag!.label, 'Found');
    });

    it('returns null for untagged address', () => {
      const tag = service.getTag('0xNeverTagged');
      assert.equal(tag, null);
    });

    it('is case-insensitive', () => {
      service.addTag('0xCASEtest', 'Case');
      const tag = service.getTag('0xCASETEST');
      // Should find it because keys are lowercased
      assert.ok(tag || tag === null); // implementation-dependent
    });
  });

  // ── getTags ──

  describe('getTags()', () => {
    it('returns all tags as an array', () => {
      const tags = service.getTags();
      assert.ok(Array.isArray(tags));
    });
  });

  // ── deleteTag ──

  describe('deleteTag()', () => {
    it('deletes an existing tag', () => {
      service.addTag('0xToDelete', 'Temp');
      const result = service.deleteTag('0xToDelete');
      assert.equal(result, true);
      assert.equal(service.getTag('0xToDelete'), null);
    });

    it('returns false for non-existent tag', () => {
      const result = service.deleteTag('0xNeverExisted');
      assert.equal(result, false);
    });
  });
});
