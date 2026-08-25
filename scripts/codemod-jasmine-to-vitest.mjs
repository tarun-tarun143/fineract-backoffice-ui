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
 * Rewrites Jasmine dialect to Vitest dialect in a spec, and renames it `.spec.ts` -> `.test.ts`.
 *
 * The migration this belongs to is DOCS/adr/0004-vitest-migration.md: Karma is deprecated and
 * `@angular/build:karma` goes with it, so every spec has to move. The mechanical part of that
 * move is a dialect swap — `jasmine.createSpy` for `vi.fn`, `.and.returnValue` for
 * `.mockReturnValue`, `toBeTrue` for `toBe(true)` — repeated across 222 files and roughly 2,500
 * sites. Doing it by hand is not a good use of a reviewer's attention, and doing it
 * inconsistently is worse than not doing it.
 *
 * ## What this does NOT do
 *
 * It converts dialect, not semantics. Three things are deliberately left for a human, and the
 * script reports them rather than guessing:
 *
 * - **`fakeAsync`/`tick`/`flush`** (5, 6 and 9 files). These are Angular's zone-based fake async
 *   and have no mechanical Vitest equivalent — the replacement is usually `await
 *   fixture.whenStable()`, which is a different shape of test, not a different spelling.
 * - **`done()` callbacks** (2 files). Vitest supports promises rather than a `done` parameter.
 * - **Custom matchers and `jasmine.addMatchers`.** None in this repo today; the check exists so
 *   that a future one is not silently dropped.
 *
 * A file needing any of those is skipped whole. A half-converted spec that still compiles is
 * the failure mode worth avoiding: it would pass review looking finished.
 *
 * ## Usage
 *
 *   node scripts/codemod-jasmine-to-vitest.mjs --dry <paths...>   report what would change
 *   node scripts/codemod-jasmine-to-vitest.mjs <paths...>         rewrite and rename
 *
 * With no paths, operates on every remaining `.spec.ts` under `src/` and `projects/`. Work in
 * small batches and run `npm run test:unit` after each: the point of a codemod is that the
 * diff is boring, and a boring diff is only verifiable if the suite it produces is green.
 */

import { existsSync, readdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const DRY = process.argv.includes('--dry');
const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));

/**
 * Constructs that carry zone or callback semantics rather than a spelling. A file using any of
 * these is skipped entirely — see the module comment.
 */
const MANUAL = [
  [/\bfakeAsync\b/, 'fakeAsync'],
  [/(?<!\.)\btick\(/, 'tick()'],
  [/(?<!\.)\bflush\(/, 'flush()'],
  [/(?<!\.)\bflushMicrotasks\(/, 'flushMicrotasks()'],
  [/\bwaitForAsync\b/, 'waitForAsync'],
  [/\bjasmine\.addMatchers\b/, 'jasmine.addMatchers'],
  [/\bjasmine\.clock\b/, 'jasmine.clock'],
  [/\(\s*done\s*[:)]/, 'done() callback'],
  // `.and.throwError('x')` has no single-expression Vitest form — the replacement needs a
  // statement body (`.mockImplementation(() => { throw new Error('x'); })`), and generating a
  // brace-balanced one by regex is how the first version of this script produced specs that
  // no longer parsed. One site in the repo; it is not worth the machinery.
  // Jasmine's `fail` and `expect().nothing()` have no Vitest equivalent. They were previously
  // masked: every file using them also tripped the unanchored `flush(`/`tick(` patterns above,
  // so anchoring those would have started emitting specs that do not compile.
  // `fail` is matched in call and reference position only, never as a bare word: two specs use
  // "fail" in prose comments and must still convert.
  [/(?<!\.)\bfail\(/, 'fail()'],
  [/:\s*fail\s*[,}]/, 'fail reference'],
  [/expect\(\s*\)\.nothing\(\)/, 'expect().nothing()'],
  [/\.and\.throwError\(/, '.and.throwError()'],
];

/**
 * Ordered rewrites. Order matters in one place: the `.and.` spy rewrites must run before the
 * `jasmine.createSpy` rewrite, because the former match on a receiver the latter would have
 * already replaced.
 */
const RULES = [
  // --- spies -------------------------------------------------------------------------------
  // `.and.returnValue(x)` -> `.mockReturnValue(x)`; likewise for the other `.and.` forms.
  [/\.and\.returnValue\(/g, '.mockReturnValue('],
  [/\.and\.callFake\(/g, '.mockImplementation('],
  [/\.and\.returnValues\(/g, '.mockReturnValueOnce('],
  [/\.and\.resolveTo\(/g, '.mockResolvedValue('],
  [/\.and\.rejectWith\(/g, '.mockRejectedValue('],
  // `.and.callThrough()` is Vitest's default for `vi.spyOn`, so the call simply goes away.
  [/\.and\.callThrough\(\)/g, ''],
  [/\.and\.stub\(\)/g, '.mockImplementation(() => {})'],

  // `jasmine.createSpy('name')` -> `vi.fn()`. The name is dropped: Vitest reports the variable,
  // and keeping it as `vi.fn().mockName('x')` adds noise to 418 sites for no diagnostic gain.
  [/jasmine\.createSpy\([^)]*\)/g, 'vi.fn()'],

  // `spyOn(obj, 'method')` -> `vi.spyOn(obj, 'method')`, but not an already-qualified
  // `vi.spyOn`, and not a bare word inside a longer identifier.
  [/(?<![.\w])spyOn\(/g, 'vi.spyOn('],

  // --- asymmetric matchers ----------------------------------------------------------------
  [/jasmine\.objectContaining\(/g, 'expect.objectContaining('],
  [/jasmine\.arrayContaining\(/g, 'expect.arrayContaining('],
  [/jasmine\.stringMatching\(/g, 'expect.stringMatching('],
  [/jasmine\.anything\(\)/g, 'expect.anything()'],
  [/jasmine\.any\(/g, 'expect.any('],

  // --- matchers ---------------------------------------------------------------------------
  [/\.toBeTrue\(\)/g, '.toBe(true)'],
  [/\.toBeFalse\(\)/g, '.toBe(false)'],
  [/\.toHaveSize\(/g, '.toHaveLength('],
  [/\.toHaveBeenCalledOnceWith\(/g, '.toHaveBeenCalledExactlyOnceWith('],

  // --- async matchers ---------------------------------------------------------------------
  // `await expectAsync(p).toBeResolvedTo(v)` -> `await expect(p).resolves.toEqual(v)`.
  [/expectAsync\(/g, 'expect('],
  [/\)\.toBeResolvedTo\(/g, ').resolves.toEqual('],

  // --- type positions ---------------------------------------------------------------------
  // `jasmine.SpyObj<T>` -> `SpyObj<T>` and `jasmine.Spy` -> `Mock`, both imported below.
  [/\bjasmine\.SpyObj\b/g, 'SpyObj'],
  [/\bjasmine\.Spy\b/g, 'Mock'],

  // --- spy introspection ------------------------------------------------------------------
  [/\.calls\.count\(\)/g, '.mock.calls.length'],
  [/\.calls\.allArgs\(\)/g, '.mock.calls'],
  // Non-null assertions: Jasmine typed `mostRecent().args` as always present, Vitest types
  // `lastCall` as possibly undefined. Asserting preserves the original spec's meaning — a test
  // that reads the last call has already established there was one — without turning the
  // migration into a strict-null audit of 50 sites.
  [/\.calls\.mostRecent\(\)\s*\.args/g, '.mock.lastCall!'],
  [/\.calls\.first\(\)\.args/g, '.mock.calls[0]!'],
  [/\.calls\.reset\(\)/g, '.mockClear()'],
  [/\.calls\.any\(\)/g, '.mock.calls.length > 0'],
];

/**
 * Rewrites `jasmine.createSpyObj<T>('Name', ['a', 'b'])` to `createSpyObj<T>(['a', 'b'])`.
 *
 * Handled separately from RULES because the name argument has to be dropped from between the
 * parentheses rather than substituted. The target is the helper in `src/app/testing/mocks.ts`,
 * which reproduces Jasmine's typing exactly — see the rationale there.
 *
 * Only the array form is converted. The object form (`createSpyObj('N', {a: of(1)})`) carries
 * return values, and a wrong guess there yields a spy returning `undefined` and a test that
 * passes anyway, so those files are reported instead.
 */
function rewriteSpyObj(source) {
  const out = source.replace(
    /jasmine\.createSpyObj(<[^>]*>)?\(\s*(?:'[^']*'|"[^"]*")\s*,\s*(\[[^\]]*\])\s*\)/g,
    (whole, generic, list) => {
      const methods = [...list.matchAll(/'([^']+)'|"([^"]+)"/g)];
      if (methods.length === 0) return whole;
      return `createSpyObj${generic ?? ''}(${list})`;
    },
  );
  // Any surviving createSpyObj is the object form, which this does not attempt.
  const manual = (out.match(/jasmine\.createSpyObj/g) ?? []).length;
  return { out, manual };
}

/**
 * Adds the imports the rewrites above depend on, and only those.
 *
 * `SpyObj`/`createSpyObj` come from the repo's testing helper, `Mock` from Vitest as a type.
 * `describe`/`it`/`expect`/`vi` are globals under the builder's `vitest/globals` types and are
 * deliberately not imported — adding them would touch every line of every spec's import block
 * for no behavioural gain.
 */
function addImports(source, file) {
  const needsSpyObj = /\bSpyObj\b/.test(source);
  const needsCreate = /\bcreateSpyObj\b/.test(source);
  const needsMock = /\bMock\b/.test(source) && !/\bMocked\w/.test(source);

  const names = [needsCreate && 'createSpyObj', needsSpyObj && 'SpyObj'].filter(Boolean);
  let out = source;

  if (names.length > 0 && !/from '.*testing\/mocks'/.test(out)) {
    // Depth from the spec to `src/app/testing/mocks`, so the import resolves from anywhere.
    const depth = file.replaceAll('\\', '/').split('/').length;
    const fromSrcApp = file.replaceAll('\\', '/').startsWith('src/app/')
      ? '../'.repeat(depth - 3) + 'testing/mocks'
      : 'src/app/testing/mocks';
    out = insertImport(out, `import { ${names.join(', ')} } from '${fromSrcApp}';`);
  }

  if (needsMock && !/import type \{[^}]*\bMock\b[^}]*\} from 'vitest'/.test(out)) {
    out = insertImport(out, `import type { Mock } from 'vitest';`);
  }

  return out;
}

/** Places an import after the licence header, before the first existing import. */
function insertImport(source, statement) {
  const firstImport = source.search(/^import /m);
  if (firstImport === -1) return `${source}\n${statement}\n`;
  return source.slice(0, firstImport) + statement + '\n' + source.slice(firstImport);
}

/** Every remaining Jasmine-dialect spec, when no explicit paths are given. */
function* specs(dir) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (full.replaceAll('\\', '/').includes('src/app/api')) continue;
      yield* specs(full);
    } else if (entry.name.endsWith('.spec.ts') || entry.name.endsWith('.test.ts')) {
      // `.test.ts` files are included so the codemod is idempotent: re-running it over a
      // partially migrated tree finishes any dialect a previous, narrower run left behind
      // rather than reporting the tree as done.
      yield full;
    }
  }
}

const targets = args.length > 0 ? args : [...specs('src'), ...specs('projects')];

let converted = 0;
let skipped = 0;
const renames = [];
const skipReasons = new Map();

for (const file of targets) {
  const source = readFileSync(file, 'utf8');

  const blockers = MANUAL.filter(([re]) => re.test(source)).map(([, name]) => name);
  if (blockers.length > 0) {
    skipped++;
    skipReasons.set(file, blockers.join(', '));
    continue;
  }

  const { out: spyObjOut, manual } = rewriteSpyObj(source);
  if (manual > 0) {
    skipped++;
    skipReasons.set(file, `${manual} createSpyObj object-form call(s)`);
    continue;
  }

  let next = spyObjOut;
  for (const [re, replacement] of RULES) next = next.replace(re, replacement);
  next = addImports(next, file);

  const renamed = file.replace(/\.spec\.ts$/, '.test.ts');

  if (DRY) {
    if (next !== source) console.log(`would convert  ${file} -> ${renamed}`);
    else if (file !== renamed) console.log(`would rename   ${file} -> ${renamed}`);
    else continue; // already migrated and already clean
  } else {
    if (next === source && file === renamed) continue;
    writeFileSync(file, next);
    if (file !== renamed) {
      renameSync(file, renamed);
      renames.push([file, renamed]);
    }
  }
  converted++;
}

/**
 * `eslint-suppressions.json` is keyed by file path, so renaming a spec orphans its entries and
 * the next `lint:prune` deletes them. The rule violations are still in the file, so they come
 * back as errors in a batch that changed nothing but the filename. Move the keys with the file.
 */
function carrySuppressions(pairs) {
  const path = 'eslint-suppressions.json';
  if (pairs.length === 0 || !existsSync(path)) return 0;
  const raw = readFileSync(path, 'utf8');
  const data = JSON.parse(raw);
  let moved = 0;
  // Rebuild in the original key order so the diff shows only the renamed entries.
  const out = {};
  const map = new Map(pairs.map(([from, to]) => [from, to]));
  for (const [key, value] of Object.entries(data)) {
    const to = map.get(key);
    if (to) {
      out[to] = value;
      moved++;
    } else {
      out[key] = value;
    }
  }
  if (moved > 0) writeFileSync(path, `${JSON.stringify(out, undefined, 2)}\n`);
  return moved;
}

const moved = DRY ? 0 : carrySuppressions(renames);

console.log(
  `\n${DRY ? '[dry run] ' : ''}${converted} spec(s) converted, ${skipped} left for a human.`,
);
if (moved > 0) console.log(`Moved ${moved} eslint-suppressions.json entr(y|ies) to the new paths.`);

if (skipReasons.size > 0) {
  console.log('\nSkipped — these need a semantic decision, not a rename:\n');
  for (const [file, reason] of skipReasons) console.log(`  ${file}\n      ${reason}`);
}
