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

import type { NavItemConfig } from './navigation-config.service';
import type { DeploymentNavItem, NavItemOverride, NavOverrides } from './config.service';

/**
 * Composition of the upstream navigation tree with a deployment's adjustments.
 *
 * A standalone module rather than more methods on `NavigationConfigService`: that service is in
 * the ~1000-line file this mechanism exists to keep deployments out of, and pure functions are
 * testable without a TestBed.
 *
 * Nothing here consults permissions or feature gates. Those run afterwards in
 * `NavigationConfigService.isItemVisible`, and deployment-added entries pass through them
 * exactly as upstream entries do.
 */

/** Something wrong with a deployment's `nav` block, surfaced rather than swallowed. */
export interface NavCompositionDefect {
  code:
    | 'missing-id'
    | 'duplicate-id'
    | 'unknown-id'
    | 'unknown-parent'
    | 'parent-not-a-group'
    | 'invalid-external-url'
    | 'self-parent';
  /** The `id` involved, or the label when the entry has no usable id to name it by. */
  id: string;
  detail: string;
}

export interface NavCompositionResult {
  items: NavItemConfig[];
  defects: NavCompositionDefect[];
}

/** A node being assembled. Same shape as the config, with children always writable. */
type MutableNav = Omit<NavItemConfig, 'children'> & { children?: MutableNav[] };

/** Where a node currently sits, so an override can lift it out again. */
interface Slot {
  node: MutableNav;
  siblings: MutableNav[];
}

const HTTP_URL = /^https?:\/\//i;

/** `parent` places an entry at composition time; it is not part of the rendered node. */
function withoutParent(item: DeploymentNavItem): MutableNav {
  const node: Record<string, unknown> = {
    ...item,
    ...(item.children ? { children: cloneTree(item.children) } : {}),
  };
  delete node['parent'];
  return node as MutableNav;
}

function cloneTree(items: readonly NavItemConfig[]): MutableNav[] {
  return items.map((item) => ({
    ...item,
    ...(item.children ? { children: cloneTree(item.children) } : {}),
  }));
}

function indexTree(items: MutableNav[], into: Map<string, Slot>): Map<string, Slot> {
  for (const node of items) {
    if (node.id) {
      into.set(node.id, { node, siblings: items });
    }
    if (node.children) {
      indexTree(node.children, into);
    }
  }
  return into;
}

/**
 * Stable sort by `order`, unordered entries keeping their declared sequence behind the rest.
 *
 * `Infinity` for a missing `order` is what produces that, since `Array.prototype.sort` is
 * stable. So giving one entry an `order` moves that entry and leaves the others where they were,
 * rather than requiring the whole menu to be numbered.
 */
function sortTree(items: MutableNav[]): void {
  items.sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity));
  for (const node of items) {
    if (node.children) {
      sortTree(node.children);
    }
  }
}

function detach(slot: Slot): void {
  const at = slot.siblings.indexOf(slot.node);
  if (at !== -1) {
    slot.siblings.splice(at, 1);
  }
}

/**
 * Applies a deployment's `nav.items` and `nav.overrides` to the upstream tree.
 *
 * `hidden` is not applied here: it runs in the same pass as the permission gates so that both
 * kinds of removal follow one rule. See `NavigationConfigService.isItemVisible`.
 *
 * @param base The upstream tree. Never mutated.
 */
export function composeNavTree(
  base: readonly NavItemConfig[],
  overrides: NavOverrides,
): NavCompositionResult {
  const defects: NavCompositionDefect[] = [];
  const roots = cloneTree(base);
  const index = indexTree(roots, new Map<string, Slot>());

  addDeploymentItems(overrides.items ?? [], roots, index, defects);
  applyOverrides(overrides.overrides ?? {}, roots, index, defects);
  sortTree(roots);

  return { items: roots, defects };
}

/** Either a container to append into, or the reason there isn't one. */
type Resolution =
  { ok: true; siblings: MutableNav[] } | { ok: false; defect: NavCompositionDefect };

/** Resolves the sibling list an entry should join, given the `parent` id it named. */
function resolveContainer(
  parentId: string | null | undefined,
  subjectId: string,
  roots: MutableNav[],
  index: Map<string, Slot>,
  verb: string,
): Resolution {
  if (parentId === null || parentId === undefined) {
    return { ok: true, siblings: roots };
  }
  const parent = index.get(parentId);
  if (!parent) {
    return {
      ok: false,
      defect: {
        code: 'unknown-parent',
        id: subjectId,
        detail: `${verb}: no nav entry has id "${parentId}".`,
      },
    };
  }
  if (!parent.node.children) {
    return {
      ok: false,
      defect: {
        code: 'parent-not-a-group',
        id: subjectId,
        detail: `${verb}: "${parentId}" is a destination, not a group, so it cannot hold children.`,
      },
    };
  }
  return { ok: true, siblings: parent.node.children };
}

/** Why this deployment-added entry cannot be used, or `null` if it can. */
function rejectDeploymentItem(
  item: DeploymentNavItem,
  index: Map<string, Slot>,
): NavCompositionDefect | null {
  if (!item.id) {
    return {
      code: 'missing-id',
      id: item.labelKey ?? '(unnamed)',
      detail: 'A nav item added by this deployment has no id, so nothing can address it.',
    };
  }
  if (index.has(item.id)) {
    // Refused rather than merged. Silently shadowing a built-in entry is how a deployment ends
    // up with a menu that does not match the upstream it claims to be running.
    return {
      code: 'duplicate-id',
      id: item.id,
      detail: 'Already used by another nav entry. Prefix deployment ids, e.g. "acme.crm".',
    };
  }
  if (item.kind === 'external' && !HTTP_URL.test(item.url ?? '')) {
    return {
      code: 'invalid-external-url',
      id: item.id,
      detail: `An external nav item needs an http(s) url; got ${JSON.stringify(item.url)}.`,
    };
  }
  return null;
}

function addDeploymentItems(
  items: readonly DeploymentNavItem[],
  roots: MutableNav[],
  index: Map<string, Slot>,
  defects: NavCompositionDefect[],
): void {
  for (const item of items) {
    const rejected = rejectDeploymentItem(item, index);
    if (rejected) {
      defects.push(rejected);
      continue;
    }

    const container = resolveContainer(item.parent, item.id, roots, index, 'Cannot add');
    if (!container.ok) {
      defects.push(container.defect);
      continue;
    }

    const node = withoutParent(item);
    container.siblings.push(node);
    index.set(item.id, { node, siblings: container.siblings });
    if (node.children) {
      indexTree(node.children, index);
    }
  }
}

/** Resolves where an override wants to move an entry, refusing moves that would orphan it. */
function resolveMove(
  id: string,
  slot: Slot,
  parentId: string | null,
  roots: MutableNav[],
  index: Map<string, Slot>,
): Resolution {
  if (parentId === id) {
    return {
      ok: false,
      defect: { code: 'self-parent', id, detail: 'An entry cannot be its own parent.' },
    };
  }
  if (parentId !== null && containsId(slot.node, parentId)) {
    // Moving a group into its own descendant would detach the whole subtree from the roots and
    // leave it pointing at itself — a menu that renders as nothing, from a one-line typo.
    return {
      ok: false,
      defect: { code: 'self-parent', id, detail: `Cannot move: "${parentId}" is inside "${id}".` },
    };
  }
  return resolveContainer(parentId, id, roots, index, 'Cannot move');
}

function applyOverrides(
  overrides: Readonly<Record<string, NavItemOverride>>,
  roots: MutableNav[],
  index: Map<string, Slot>,
  defects: NavCompositionDefect[],
): void {
  for (const [id, patch] of Object.entries(overrides)) {
    const slot = index.get(id);
    if (!slot) {
      // The whole point of stable ids is that this cannot happen quietly. An override naming an
      // entry that no longer exists means the deployment's intent is not being honoured, and the
      // operator has to be told rather than left with a menu they thought they had changed.
      defects.push({
        code: 'unknown-id',
        id,
        detail: 'No nav entry has this id. It may have been removed or renamed upstream.',
      });
      continue;
    }

    if (patch.labelKey !== undefined) slot.node.labelKey = patch.labelKey;
    if (patch.icon !== undefined) slot.node.icon = patch.icon;
    if (patch.order !== undefined) slot.node.order = patch.order;
    if (patch.parent === undefined) continue;

    const move = resolveMove(id, slot, patch.parent, roots, index);
    if (!move.ok) {
      defects.push(move.defect);
      continue;
    }
    detach(slot);
    move.siblings.push(slot.node);
    index.set(id, { node: slot.node, siblings: move.siblings });
  }
}

function containsId(node: MutableNav, id: string): boolean {
  return (node.children ?? []).some((child) => child.id === id || containsId(child, id));
}
