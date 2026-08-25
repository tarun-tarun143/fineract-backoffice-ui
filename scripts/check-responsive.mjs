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
 * Guards the handful of invariants the narrow layout rests on.
 *
 * The e2e `mobile` project proves the shell behaves at 390px, but it can only check pages it
 * visits, and it cannot see a rule that is *about* to break something. These are the mistakes
 * that are invisible in a diff, cheap to make, and expensive to find by eye on a phone:
 *
 *   1. One breakpoint. It lives in ViewportService and in a media query in each component that
 *      needs one, and those must agree — a shell that reflows at 768px with a table that reflows
 *      at 640px has a band where the sidebar is a drawer and the table is still a table.
 *   2. No `100vh` on a full-height container. Mobile browsers measure vh against the viewport
 *      with the URL bar retracted, so 100vh is taller than the screen and the bottom of the page
 *      sits under the browser chrome. `100dvh` is the fix and there is no reason to reintroduce
 *      the other.
 *   3. No fixed pixel widths wide enough to force a horizontal scroll at the narrowest supported
 *      viewport.
 *
 * Deliberately narrow. This is not a general responsive-design linter — it checks three things
 * that have a single correct answer, and stays quiet about everything that is a judgement call.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const SRC = join(ROOT, 'src');

/** Must match MOBILE_BREAKPOINT_PX in src/app/core/services/viewport.service.ts. */
const VIEWPORT_SERVICE = join(SRC, 'app/core/services/viewport.service.ts');

/** The narrowest viewport the project supports. iPhone SE and most budget Androids. */
const NARROWEST_PX = 320;

/**
 * Breakpoints that are legitimately not the shell breakpoint.
 *
 * A component may reflow at its own width when the reason is its own content rather than the
 * shell changing shape — a wide chart, a form that wants two columns while it can have them.
 * Each entry is a deliberate exception rather than a blanket allowance.
 */
const ALLOWED_OTHER_BREAKPOINTS = new Map([
  ['src/app/features/reporting/run-report.component.ts', 'wide parameter grid drops to one column'],
  ['src/app/features/products/shares/share-account-view.component.ts', 'summary grid'],
  ['src/app/shared/components/charts/bar-chart.component.ts', 'chart label density'],
]);

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (/\.(ts|scss)$/.test(path) && !/\.(spec|test)\.ts$/.test(path)) out.push(path);
  }
  return out;
}

function breakpointFromService() {
  const source = readFileSync(VIEWPORT_SERVICE, 'utf8');
  const match = /export const MOBILE_BREAKPOINT_PX = (\d+);/.exec(source);
  if (!match) {
    throw new Error(`MOBILE_BREAKPOINT_PX not found in ${relative(ROOT, VIEWPORT_SERVICE)}`);
  }
  return Number(match[1]);
}

const breakpoint = breakpointFromService();
const problems = [];

for (const file of walk(SRC)) {
  const source = readFileSync(file, 'utf8');
  const where = relative(ROOT, file);

  // 1 — one breakpoint
  for (const [, width] of source.matchAll(/@media\s*\([^)]*max-width:\s*(\d+)px/g)) {
    if (Number(width) === breakpoint) continue;
    if (ALLOWED_OTHER_BREAKPOINTS.has(where)) continue;
    problems.push(
      `${where}: @media max-width ${width}px does not match the shell breakpoint ` +
        `(${breakpoint}px). Use MOBILE_BREAKPOINT_PX, or add an entry to ` +
        `ALLOWED_OTHER_BREAKPOINTS in this script saying why this one is its own.`,
    );
  }

  // 2 — no 100vh on a height/min-height
  for (const [match] of source.matchAll(/(?:min-)?height:\s*100vh/g)) {
    problems.push(
      `${where}: "${match}" — use 100dvh. Mobile browsers measure vh against the retracted ` +
        'URL bar, so 100vh overflows the screen.',
    );
  }

  // 3 — no unbounded fixed width wider than the narrowest supported viewport.
  //
  // "Unbounded" is the operative word: `width: 360px` next to `max-width: calc(100vw - 48px)`
  // cannot overflow, and flagging it would be the kind of false positive that gets a check
  // muted rather than fixed. So the rule block is inspected, not just the line.
  for (const declaration of source.matchAll(/(?<!max-|min-)\bwidth:\s*(\d{3,})px/g)) {
    if (Number(declaration[1]) <= NARROWEST_PX) continue;
    const blockStart = source.lastIndexOf('{', declaration.index);
    const blockEnd = source.indexOf('}', declaration.index);
    const block = source.slice(blockStart, blockEnd === -1 ? source.length : blockEnd);
    if (/max-width\s*:/.test(block)) continue;
    problems.push(
      `${where}: "${declaration[0]}" forces a horizontal scroll at ${NARROWEST_PX}px, and the ` +
        'rule sets no max-width. Use a max-width, a percentage, or min(…).',
    );
  }
}

if (problems.length > 0) {
  console.error(`✗ Responsive layout check failed (${problems.length}):\n`);
  for (const problem of problems) console.error(`  - ${problem}`);
  console.error('\n  See DOCS/MOBILE.md.\n');
  process.exit(1);
}

console.log(
  `✓ Responsive invariants hold: one breakpoint (${breakpoint}px), no 100vh, ` +
    `no fixed width above ${NARROWEST_PX}px.`,
);
