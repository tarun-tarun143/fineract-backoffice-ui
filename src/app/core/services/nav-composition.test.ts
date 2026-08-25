/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { composeNavTree } from './nav-composition';
import type { NavItemConfig } from './navigation-config.service';

const BASE: readonly NavItemConfig[] = [
  { id: 'dashboard', route: '/dashboard', labelKey: 'nav.dashboard' },
  { id: 'clients', route: '/clients', labelKey: 'nav.clients' },
  {
    id: 'products',
    labelKey: 'nav.products',
    children: [
      { id: 'products.loan', route: '/products/loan', labelKey: 'nav.loanProducts' },
      { id: 'products.savings', route: '/products/savings', labelKey: 'nav.savingsProducts' },
    ],
  },
];

const idsOf = (items: NavItemConfig[]) => items.map((i) => i.id);
const byId = (items: NavItemConfig[], id: string): NavItemConfig | undefined =>
  items.flatMap((i) => [i, ...(i.children ?? [])]).find((i) => i.id === id);

describe('composeNavTree', () => {
  it('returns the base tree unchanged when the deployment says nothing', () => {
    const { items, defects } = composeNavTree(BASE, {});

    expect(defects).toEqual([]);
    expect(idsOf(items)).toEqual(['dashboard', 'clients', 'products']);
    expect(idsOf(items[2].children!)).toEqual(['products.loan', 'products.savings']);
  });

  it('never mutates the base tree', () => {
    const snapshot = JSON.stringify(BASE);

    composeNavTree(BASE, {
      overrides: { clients: { labelKey: 'Members', parent: 'products' } },
      items: [{ id: 'acme.crm', labelKey: 'CRM', kind: 'external', url: 'https://crm.example' }],
    });

    expect(JSON.stringify(BASE)).toBe(snapshot);
  });

  describe('overrides', () => {
    it('renames and re-icons an entry without touching the rest', () => {
      const { items } = composeNavTree(BASE, {
        overrides: { clients: { labelKey: 'Members', icon: 'person-outline' } },
      });

      expect(byId(items, 'clients')).toMatchObject({
        labelKey: 'Members',
        icon: 'person-outline',
        route: '/clients',
      });
      expect(byId(items, 'dashboard')?.labelKey).toBe('nav.dashboard');
    });

    it('moves an entry into another group', () => {
      const { items, defects } = composeNavTree(BASE, {
        overrides: { clients: { parent: 'products' } },
      });

      expect(defects).toEqual([]);
      expect(idsOf(items)).toEqual(['dashboard', 'products']);
      expect(idsOf(byId(items, 'products')!.children!)).toContain('clients');
    });

    it('lifts an entry to the top level with parent: null', () => {
      const { items } = composeNavTree(BASE, {
        overrides: { 'products.loan': { parent: null } },
      });

      expect(idsOf(items)).toContain('products.loan');
      expect(idsOf(byId(items, 'products')!.children!)).toEqual(['products.savings']);
    });

    it('reports an override naming an id that does not exist', () => {
      // The whole reason ids are stable: an override that stops matching has to be loud, because
      // the deployment's intent is silently not being applied.
      const { defects } = composeNavTree(BASE, {
        overrides: { 'nav.clients': { labelKey: 'Members' } },
      });

      expect(defects).toEqual([expect.objectContaining({ code: 'unknown-id', id: 'nav.clients' })]);
    });

    it('refuses to move a group inside its own descendant', () => {
      const { items, defects } = composeNavTree(BASE, {
        overrides: { products: { parent: 'products.loan' } },
      });

      expect(defects).toEqual([expect.objectContaining({ code: 'self-parent', id: 'products' })]);
      // The subtree stays where it was rather than detaching into nothing.
      expect(idsOf(items)).toContain('products');
    });

    it('refuses to move an entry under a destination that cannot hold children', () => {
      const { defects } = composeNavTree(BASE, {
        overrides: { clients: { parent: 'dashboard' } },
      });

      expect(defects).toEqual([
        expect.objectContaining({ code: 'parent-not-a-group', id: 'clients' }),
      ]);
    });
  });

  describe('deployment items', () => {
    it('adds a top-level entry', () => {
      const { items, defects } = composeNavTree(BASE, {
        items: [{ id: 'acme.ops', labelKey: 'Operations', icon: 'briefcase-outline' }],
      });

      expect(defects).toEqual([]);
      expect(idsOf(items)).toContain('acme.ops');
    });

    it('nests an entry under an existing group', () => {
      const { items } = composeNavTree(BASE, {
        items: [{ id: 'acme.report', labelKey: 'Custom report', parent: 'products' }],
      });

      expect(idsOf(byId(items, 'products')!.children!)).toContain('acme.report');
      // `parent` is a placement instruction, not a rendered field.
      expect(byId(items, 'acme.report')).not.toHaveProperty('parent');
    });

    it('accepts an external entry with an http url', () => {
      const { items, defects } = composeNavTree(BASE, {
        items: [
          { id: 'acme.crm', labelKey: 'Field CRM', kind: 'external', url: 'https://crm.example' },
        ],
      });

      expect(defects).toEqual([]);
      expect(byId(items, 'acme.crm')).toMatchObject({
        kind: 'external',
        url: 'https://crm.example',
      });
    });

    it.each([
      ['a missing url', undefined],
      ['a relative path', '/somewhere'],
      ['a javascript: url', 'javascript:alert(1)'],
    ])('rejects an external entry with %s', (_label, url) => {
      const { items, defects } = composeNavTree(BASE, {
        items: [{ id: 'acme.crm', labelKey: 'CRM', kind: 'external', url: url as string }],
      });

      expect(defects).toEqual([
        expect.objectContaining({ code: 'invalid-external-url', id: 'acme.crm' }),
      ]);
      expect(byId(items, 'acme.crm')).toBeUndefined();
    });

    it('refuses an id that shadows a built-in entry', () => {
      const { items, defects } = composeNavTree(BASE, {
        items: [{ id: 'clients', labelKey: 'Our clients' }],
      });

      expect(defects).toEqual([expect.objectContaining({ code: 'duplicate-id', id: 'clients' })]);
      expect(byId(items, 'clients')?.labelKey).toBe('nav.clients');
    });

    it('reports an entry whose parent does not exist, and drops it', () => {
      const { items, defects } = composeNavTree(BASE, {
        items: [{ id: 'acme.x', labelKey: 'X', parent: 'nope' }],
      });

      expect(defects).toEqual([expect.objectContaining({ code: 'unknown-parent', id: 'acme.x' })]);
      expect(byId(items, 'acme.x')).toBeUndefined();
    });
  });

  describe('ordering', () => {
    it('sorts entries carrying an order ahead of those without, preserving declared order', () => {
      const { items } = composeNavTree(BASE, {
        overrides: { products: { order: 1 } },
      });

      // `products` moves to the front; `dashboard` and `clients` keep their relative sequence.
      expect(idsOf(items)).toEqual(['products', 'dashboard', 'clients']);
    });

    it('orders children within a group', () => {
      const { items } = composeNavTree(BASE, {
        overrides: { 'products.savings': { order: 1 } },
      });

      expect(idsOf(byId(items, 'products')!.children!)).toEqual([
        'products.savings',
        'products.loan',
      ]);
    });

    it('places an added entry by order alongside built-in ones', () => {
      const { items } = composeNavTree(BASE, {
        items: [{ id: 'acme.ops', labelKey: 'Operations', order: 1 }],
        overrides: { dashboard: { order: 2 } },
      });

      expect(idsOf(items).slice(0, 2)).toEqual(['acme.ops', 'dashboard']);
    });
  });
});
