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

import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { ViewportService } from './viewport.service';

/**
 * State of the navigation panel, which is two different components wearing one name.
 *
 * On a wide viewport it is a permanent column that can be narrowed to icons — {@link isCollapsed}.
 * On a narrow one it is a modal drawer that is closed until asked for — {@link isDrawerOpen}.
 * These are deliberately separate pieces of state rather than one flag read two ways: an operator
 * who collapsed the sidebar on a desktop should still find the drawer closed on a phone, and
 * should get their collapsed column back on rotating to landscape rather than an open overlay.
 */
@Injectable({ providedIn: 'root' })
export class SidebarService {
  private readonly viewport = inject(ViewportService);

  /** Whether the wide-viewport sidebar is narrowed to icons. Irrelevant while the drawer is in use. */
  readonly isCollapsed = signal(false);

  private readonly _isDrawerOpen = signal(false);

  /** Whether the narrow-viewport drawer is showing. Always false on a wide viewport. */
  readonly isDrawerOpen = computed(() => this.viewport.isMobile() && this._isDrawerOpen());

  constructor() {
    // Leaving the drawer "open" behind a viewport change would restore an overlay the user never
    // asked for the next time they narrowed the window.
    effect(() => {
      if (!this.viewport.isMobile()) {
        this._isDrawerOpen.set(false);
      }
    });
  }

  /** What the header's one navigation button does, whichever layout is in force. */
  toggle(): void {
    if (this.viewport.isMobile()) {
      this._isDrawerOpen.update((open) => !open);
    } else {
      this.isCollapsed.update((collapsed) => !collapsed);
    }
  }

  /** Closes the drawer. Called on navigation, on Escape, and on a backdrop press. */
  closeDrawer(): void {
    this._isDrawerOpen.set(false);
  }
}
