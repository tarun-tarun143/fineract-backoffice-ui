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
 * Keeps `public/branding/` empty in this repository.
 *
 * The whole customization contract rests on one promise: upstream never writes to that path, so
 * a deployment that mounts its own files there can take every release as a version bump instead
 * of a rebase. A promise in a document decays; the first upstream commit that drops a default
 * logo or an example config in there turns every downstream upgrade into a merge conflict, and
 * nobody notices until a downstream reports it a release later.
 *
 * So the promise is a build step. A tracked file under the reserved path fails CI.
 */

import { execFileSync } from 'node:child_process';

const RESERVED = 'public/branding';

let tracked = [];
try {
  const output = execFileSync('git', ['ls-files', '--', RESERVED], { encoding: 'utf8' });
  tracked = output.split('\n').filter(Boolean);
} catch (error) {
  // No git (a source tarball, a container build) means nothing to check rather than a failure.
  console.log(`✓ ${RESERVED} check skipped: not a git working tree.`);
  process.exit(0);
}

if (tracked.length > 0) {
  console.error(`✗ ${RESERVED}/ is reserved for deployments and must stay empty upstream.\n`);
  console.error('  Tracked files found:');
  for (const file of tracked) console.error(`    ${file}`);
  console.error(
    '\n  Anything committed here becomes a merge conflict for every downstream that mounts its\n' +
      '  own overlay. Defaults belong in DEFAULT_CONFIG or public/config.json; worked examples\n' +
      '  belong in DOCS/examples/. See DOCS/CUSTOMIZATION.md.\n',
  );
  process.exit(1);
}

console.log(`✓ ${RESERVED}/ is reserved and empty.`);
