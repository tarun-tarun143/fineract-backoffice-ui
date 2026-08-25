#!/usr/bin/env node
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

/**
 * Resolves a reference downstream's configuration against the current tree.
 *
 * `DOCS/examples/branding-config.example.json` stands in for a real deployment: an invented bank
 * that hides sections, renames entries, retints the palette and adds a group of its own. It is
 * deliberately maximal, because the promise being tested is that such a deployment takes an
 * upstream release as a version bump.
 *
 * Nothing else catches this. The unit tests use a fixture tree of three entries, and the e2e
 * suite mocks whatever overlay each case needs — so both keep passing while an id the real
 * example names quietly disappears from NAV_CONFIG. What breaks is the downstream, one release
 * later, with a menu that silently stopped matching.
 *
 * Checked here, against the shipped surface rather than a fixture:
 *
 *   - every nav id named by `hidden`, `overrides` or a `parent` resolves
 *   - every added id is free, so nothing shadows a built-in entry
 *   - every token named is on the published allow-list
 *   - every colour clears the contrast floor the runtime enforces
 *   - every external entry has an http(s) url
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const EXAMPLE = join(ROOT, 'DOCS/examples/branding-config.example.json');
const NAV_IDS = join(HERE, 'nav-ids.json');
const BRANDING_SERVICE = join(ROOT, 'src/app/core/services/branding.service.ts');

/** WCAG 2.1 relative luminance. Mirrors the arithmetic in branding.service.ts. */
function luminance(hex) {
  return [1, 3, 5]
    .map((at) => parseInt(hex.slice(at, at + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
    .reduce((sum, c, i) => sum + [0.2126, 0.7152, 0.0722][i] * c, 0);
}

const contrastWithWhite = (hex) => 1.05 / (luminance(hex) + 0.05);

/** The allow-list and the floor are read from the service, never restated, so they cannot drift. */
function readBrandingContract() {
  const source = readFileSync(BRANDING_SERVICE, 'utf8');

  const listBody = /export const BRANDABLE_TOKENS: readonly string\[\] = \[([\s\S]*?)\];/.exec(
    source,
  );
  if (!listBody) throw new Error('BRANDABLE_TOKENS not found in branding.service.ts');
  const tokens = [...listBody[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);

  const floor = /export const MIN_PRIMARY_CONTRAST = ([\d.]+);/.exec(source);
  if (!floor) throw new Error('MIN_PRIMARY_CONTRAST not found in branding.service.ts');

  const names = (label) => {
    const block = new RegExp(`const ${label} = new Set\\(\\[([\\s\\S]*?)\\]\\);`).exec(source);
    return new Set(block ? [...block[1].matchAll(/'([^']+)'/g)].map((m) => m[1]) : []);
  };

  return {
    tokens: new Set(tokens),
    floor: Number(floor[1]),
    requiresWhite: names('REQUIRES_WHITE_TEXT'),
  };
}

/** Every id the example's added items introduce, including nested children. */
function collectAddedIds(items, into = []) {
  for (const item of items ?? []) {
    if (item.id) into.push(item.id);
    collectAddedIds(item.children, into);
  }
  return into;
}

function* walkItems(items) {
  for (const item of items ?? []) {
    yield item;
    yield* walkItems(item.children);
  }
}

const example = JSON.parse(readFileSync(EXAMPLE, 'utf8'));
const shippedIds = new Set(JSON.parse(readFileSync(NAV_IDS, 'utf8')).ids);
const { tokens: brandable, floor, requiresWhite } = readBrandingContract();

const problems = [];
const nav = example.nav ?? {};
const addedIds = collectAddedIds(nav.items);
const knownIds = new Set([...shippedIds, ...addedIds]);

for (const id of nav.hidden ?? []) {
  if (!shippedIds.has(id)) {
    problems.push(`nav.hidden names "${id}", which is not a nav id in this tree.`);
  }
}

for (const id of Object.keys(nav.overrides ?? {})) {
  if (!knownIds.has(id)) {
    problems.push(`nav.overrides names "${id}", which is not a nav id in this tree.`);
  }
}

for (const [id, patch] of Object.entries(nav.overrides ?? {})) {
  if (patch.parent && !knownIds.has(patch.parent)) {
    problems.push(`nav.overrides["${id}"].parent names "${patch.parent}", which does not exist.`);
  }
}

for (const id of addedIds) {
  if (shippedIds.has(id)) {
    problems.push(`nav.items adds "${id}", which shadows a built-in entry. Prefix deployment ids.`);
  }
}
const seenAdded = new Set();
for (const id of addedIds) {
  if (seenAdded.has(id)) problems.push(`nav.items uses "${id}" more than once.`);
  seenAdded.add(id);
}

for (const item of walkItems(nav.items)) {
  if (item.parent && !knownIds.has(item.parent)) {
    problems.push(`nav.items["${item.id}"].parent names "${item.parent}", which does not exist.`);
  }
  if (item.kind === 'external' && !/^https?:\/\//i.test(item.url ?? '')) {
    problems.push(`nav.items["${item.id}"] is external but has no http(s) url.`);
  }
}

const tokenSets = example.branding?.tokens ?? {};
for (const [mode, set] of Object.entries(tokenSets)) {
  for (const [name, value] of Object.entries(set ?? {})) {
    if (!brandable.has(name)) {
      problems.push(`branding.tokens.${mode} sets "${name}", which is not a brandable token.`);
      continue;
    }
    if (!/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(value)) continue;

    const hex =
      value.length === 4
        ? `#${value
            .slice(1)
            .split('')
            .map((d) => d + d)
            .join('')}`
        : value.toLowerCase();

    // The one rule the runtime can refuse on, so the example cannot document a colour the
    // application would reject. Colours whose label is derived need no check: the better of
    // white and black is never worse than 4.58:1, so every one of them has a compliant label.
    if (requiresWhite.has(name) && contrastWithWhite(hex) < floor) {
      problems.push(
        `branding.tokens.${mode}.${name} is ${hex}, scoring ` +
          `${contrastWithWhite(hex).toFixed(2)}:1 against white — below the ${floor}:1 floor. ` +
          'This fill carries white text that no variable can change.',
      );
    }
  }
}

const where = relative(ROOT, EXAMPLE);
if (problems.length > 0) {
  console.error(`✗ The reference downstream config no longer resolves against this tree.\n`);
  console.error(`  ${where}\n`);
  for (const problem of problems) console.error(`  - ${problem}`);
  console.error(
    '\n  A real deployment writing this file would hit the same failure on upgrade. Either the\n' +
      '  change that removed the id or token needs a deprecation, or the example needs updating\n' +
      '  to match a deliberate rename. See DOCS/CUSTOMIZATION.md.\n',
  );
  process.exit(1);
}

const counts = [
  `${(nav.hidden ?? []).length} hidden`,
  `${Object.keys(nav.overrides ?? {}).length} overridden`,
  `${addedIds.length} added`,
  `${Object.values(tokenSets).reduce((n, set) => n + Object.keys(set ?? {}).length, 0)} tokens`,
];
console.log(`✓ Reference downstream resolves: ${counts.join(', ')}.`);
