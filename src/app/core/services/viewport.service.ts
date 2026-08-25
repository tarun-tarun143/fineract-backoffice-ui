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

import { DestroyRef, Injectable, inject, signal } from '@angular/core';

/**
 * The width below which the shell switches to its narrow layout.
 *
 * One number, exported, because it has to agree in three places that cannot see each other: the
 * media queries in the components, this service, and the viewport the Playwright `mobile` project
 * runs at. A layout that flips at 768px while its tests run at 800px passes for the wrong reason.
 *
 * 768 is the boundary the application already used in the handful of media queries that predate
 * this, so it is the existing convention rather than a new one.
 */
export const MOBILE_BREAKPOINT_PX = 768;

/** `matchMedia` for {@link MOBILE_BREAKPOINT_PX}. Exported so specs can assert on the same string. */
export const MOBILE_MEDIA_QUERY = `(max-width: ${MOBILE_BREAKPOINT_PX}px)`;

/**
 * Whether the viewport is narrow, as a signal.
 *
 * A service rather than a media query in each component because the narrow layout is not purely
 * presentational: the sidebar becomes a modal drawer, which changes focus behaviour and what the
 * Escape key does. CSS can move the sidebar off-canvas but cannot tell the component it is now a
 * dialog, so the breakpoint has to exist in TypeScript as well — and then it must be the same
 * breakpoint, which is why {@link MOBILE_BREAKPOINT_PX} is shared rather than repeated.
 */
@Injectable({ providedIn: 'root' })
export class ViewportService {
  private readonly destroyRef = inject(DestroyRef);
  private readonly _isMobile = signal(false);

  /** True while the viewport is at or below {@link MOBILE_BREAKPOINT_PX}. */
  readonly isMobile = this._isMobile.asReadonly();

  constructor() {
    // Guarded because `matchMedia` is absent in some test environments, and a shell that throws
    // at construction takes the whole application with it. Absent reads as "not mobile", which
    // is the behaviour everything had before this existed.
    const query = window.matchMedia?.(MOBILE_MEDIA_QUERY);
    if (!query) return;

    this._isMobile.set(query.matches);

    const onChange = (event: MediaQueryListEvent) => this._isMobile.set(event.matches);
    query.addEventListener('change', onChange);
    this.destroyRef.onDestroy(() => query.removeEventListener('change', onChange));
  }
}
