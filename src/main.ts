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

import { initFederation } from '@angular-architects/native-federation';

// No framework imports above this line: native-federation must set up its shared-dependency
// import map before anything imports a package like '@angular/core', or resolution fails.
// That also rules out HttpClient here, which is why the probe below uses bare `fetch`.

/**
 * Where the `fineract-mfe` demo remote is served from during development.
 *
 * `ng serve` for the remote runs on 4201. The released image does not carry the remote at all:
 * `deploy/Dockerfile` runs `ng build` against the default project only and copies
 * `dist/fineract-backoffice-ui/browser`, which never contains one.
 */
const DEV_REMOTE_ENTRY = 'http://localhost:4201/remoteEntry.json';

const isLocalDevServer = location.hostname === 'localhost' || location.hostname === '127.0.0.1';

/**
 * Resolves the remote map, which is empty unless a remote is actually there.
 *
 * The map used to be unconditional, and the released image has no remote behind it, so
 * `initFederation` was handed the SPA shell — `nginx.conf.template` answered the missing
 * `/remoteEntry.json` from `try_files ... /index.html` with a 200 — and threw a JSON parse error
 * on every production page load. The rejection was caught, so the application still booted, but
 * every session opened with an error in the console and the `/fineract-mfe` route failed when
 * visited.
 *
 * nginx now returns a real 404 for that path, and this probes before declaring the remote, so an
 * image with no remote initialises with an empty map and stays silent. When configurable plugins
 * land, this is where their entries join the map.
 */
async function resolveRemotes(): Promise<Record<string, string>> {
  const entry = isLocalDevServer ? DEV_REMOTE_ENTRY : './remoteEntry.json';
  try {
    // HEAD rather than GET: all that matters is whether a remote is being served, and a 200
    // carrying index.html is not one. `cache: 'no-store'` keeps a stale negative from sticking.
    const response = await fetch(entry, { method: 'HEAD', cache: 'no-store' });
    const contentType = response.headers.get('content-type') ?? '';
    if (response.ok && contentType.includes('json')) {
      return { 'fineract-mfe': entry };
    }
  } catch {
    // Offline, blocked by CSP, or nothing listening on 4201 in development. All of these mean
    // the same thing: there is no remote to federate with.
  }
  return {};
}

resolveRemotes()
  .then((remotes) => initFederation(remotes))
  .catch((err) => console.error(err))
  .then(() => import('./bootstrap'))
  .catch((err) => console.error(err));
