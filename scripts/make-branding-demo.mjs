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
 * Mounts an invented bank's overlay into `public/branding/` so `npm start` shows what a
 * customized deployment actually looks like.
 *
 * The customization surface is otherwise invisible to the people maintaining it: nothing in a
 * default checkout exercises it, so a change that breaks branding looks fine locally and fails
 * at a downstream. This makes the mechanism something a developer can see in a browser in one
 * command, which is also the fastest way to review a change to it.
 *
 * The target is gitignored and `scripts/check-branding-path.mjs` fails the build if anything
 * there is ever committed, so this cannot leak into a release. Undo with `--clean`.
 *
 *   npm run branding:demo            mount it
 *   npm run branding:demo -- --clean remove it
 */

import { writeFileSync, mkdirSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const TARGET = join(ROOT, 'public/branding');
const EXAMPLE = join(ROOT, 'DOCS/examples/branding-config.example.json');

if (process.env.NODE_ENV === 'production') {
  console.error('✗ Refusing to run with NODE_ENV=production. This writes demo data.');
  process.exit(1);
}

const rel = (path) => relative(ROOT, path);

if (process.argv.includes('--clean')) {
  if (existsSync(TARGET)) {
    rmSync(TARGET, { recursive: true, force: true });
    console.log(`✓ Removed ${rel(TARGET)}. The application is back on its shipped branding.`);
  } else {
    console.log(`✓ Nothing to remove: ${rel(TARGET)} does not exist.`);
  }
  process.exit(0);
}

const BRAND = 'Any Community Bank';
const MARK = '#0b5f8a';
const MARK_DARK = '#5fb3e0';

/**
 * A wordmark generated rather than committed, so no binary asset lives in the tree for a demo.
 * Two letters in a rounded square is enough to make "the logo changed" obvious at a glance.
 */
const logo = (
  fill,
  text,
) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32" role="img" aria-label="${BRAND}">
  <rect width="32" height="32" rx="7" fill="${fill}"/>
  <text x="16" y="21" text-anchor="middle" font-family="system-ui, sans-serif" font-size="13" font-weight="700" fill="${text}">AC</text>
</svg>
`;

// The overlay is the reference example verbatim, so the thing a developer sees running is the
// same thing CI resolves in check-reference-downstream.mjs — one artefact, not two that drift.
const config = JSON.parse(readFileSync(EXAMPLE, 'utf8'));

/** Strings a deployment restates, layered over the shipped catalogue. */
const strings = {
  nav: {
    dashboard: 'Overview',
    loans: 'Lending',
  },
  app: {
    logout: 'Sign out',
  },
};

mkdirSync(join(TARGET, 'i18n'), { recursive: true });
writeFileSync(join(TARGET, 'config.json'), `${JSON.stringify(config, null, 2)}\n`);
writeFileSync(join(TARGET, 'logo.svg'), logo(MARK, '#ffffff'));
writeFileSync(join(TARGET, 'logo-dark.svg'), logo(MARK_DARK, '#0d1b24'));
writeFileSync(join(TARGET, 'favicon.svg'), logo(MARK, '#ffffff'));
writeFileSync(join(TARGET, 'i18n/en.json'), `${JSON.stringify(strings, null, 2)}\n`);

console.log(`✓ Mounted the ${BRAND} demo overlay in ${rel(TARGET)}:\n`);
console.log(
  `    config.json     ${(config.nav?.hidden ?? []).length} sections hidden, ` +
    `${Object.keys(config.nav?.overrides ?? {}).length} entries renamed, own group added`,
);
console.log(`    logo.svg        wordmark in ${MARK}, and a dark variant`);
console.log(`    i18n/en.json    Dashboard -> Overview, Loans -> Lending`);
console.log(`\n  Run 'npm start' and sign in. Undo with 'npm run branding:demo -- --clean'.`);
