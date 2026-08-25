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

import { inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { TranslateLoader, type TranslationObject } from '@ngx-translate/core';
import { Observable, forkJoin, map, of, catchError } from 'rxjs';
import { skipErrorToast, skipLoading } from '../../http/http-context';

const SHIPPED_PREFIX = 'assets/i18n/';

/** Where a deployment puts its own strings. Gitignored upstream; absent on most deployments. */
const OVERLAY_PREFIX = 'branding/i18n/';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Recursively merges `patch` over `base`, so an overlay may restate one key in one section. */
function deepMerge(
  base: Record<string, unknown>,
  patch: Record<string, unknown>,
): Record<string, unknown> {
  const out = { ...base };
  for (const [key, value] of Object.entries(patch)) {
    const existing = out[key];
    out[key] = isPlainObject(value) && isPlainObject(existing) ? deepMerge(existing, value) : value;
  }
  return out;
}

/**
 * Loads the shipped catalogue and layers a deployment's own strings over it.
 *
 * "Call them Members, not Clients" arrives as a branding request and is answered as a translation
 * one. The catalogues in `assets/i18n/` belong to upstream, and a deployment editing them
 * conflicts on every release that touches a key; this reads a parallel file the deployment owns.
 *
 * The merge happens *in the loader*, deliberately, rather than by calling `setTranslation` after
 * the fact. ngx-translate publishes a language's catalogue as a whole when its loader completes,
 * so a merge applied from outside races that publication and is silently overwritten when it
 * loses — which it did. Returning one already-merged catalogue removes the race rather than
 * timing around it, and means no component has to re-render to pick the overlay up.
 *
 * A missing overlay is the normal case and resolves to `{}`.
 *
 * Lives inside the adapter boundary because it is a ngx-translate implementation detail: the
 * `TranslateLoader` contract is the library's, and ADR-0003 keeps that surface here rather than
 * letting it spread into `core/services`.
 */
export class DeploymentTranslateLoader extends TranslateLoader {
  private readonly http = inject(HttpClient);

  override getTranslation(lang: string): Observable<TranslationObject> {
    const shipped = this.http.get<TranslationObject>(`${SHIPPED_PREFIX}${lang}.json`, {
      context: skipLoading(skipErrorToast()),
    });

    const overlay = this.http
      .get<TranslationObject>(`${OVERLAY_PREFIX}${lang}.json`, {
        context: skipLoading(skipErrorToast()),
      })
      // Absent is expected. Reporting it would train operators to ignore the console.
      .pipe(catchError(() => of({} as TranslationObject)));

    return forkJoin([shipped, overlay]).pipe(
      map(
        ([base, patch]) =>
          deepMerge(
            base as Record<string, unknown>,
            patch as Record<string, unknown>,
          ) as TranslationObject,
      ),
    );
  }
}
