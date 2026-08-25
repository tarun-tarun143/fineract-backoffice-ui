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

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { HeaderComponent } from './header.component';
import { AuthService } from '../core/services/auth.service';
import { NavigationConfigService } from '../core/services/navigation-config.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Router } from '@angular/router';
import { ViewportService } from '../core/services/viewport.service';
import { EMPTY } from 'rxjs';
import { WritableSignal, signal } from '@angular/core';

describe('HeaderComponent', () => {
  let component: HeaderComponent;
  let fixture: ComponentFixture<HeaderComponent>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let navigationConfigSpy: jasmine.SpyObj<NavigationConfigService>;
  let translateService: TranslateService;
  let routerSpy: jasmine.SpyObj<Router>;
  let isMobile: WritableSignal<boolean>;

  beforeEach(async () => {
    authServiceSpy = jasmine.createSpyObj('AuthService', ['logout'], {
      username: signal('mifos'),
      officeName: signal('Head Office'),
    });
    navigationConfigSpy = jasmine.createSpyObj('NavigationConfigService', ['searchRoutes']);
    navigationConfigSpy.searchRoutes.and.returnValue([]);
    // `routerState` and `events` are properties, not methods, so createSpyObj needs them in the
    // property bag. The header reads the route tree for the phone header's page title, the same
    // way BreadcrumbComponent does; without them it throws in ngOnInit.
    routerSpy = jasmine.createSpyObj('Router', ['navigate', 'navigateByUrl'], {
      routerState: { snapshot: { root: { url: [], routeConfig: null, firstChild: null } } },
      events: EMPTY,
    });

    // Pinned, not inherited from the harness. The header renders a different set of controls
    // either side of the breakpoint, and Karma runs specs in an iframe narrower than the
    // browser window — so the real ViewportService reports "mobile" under ChromeHeadless and
    // "desktop" under a headed run, and these assertions passed or failed on which browser CI
    // happened to use.
    isMobile = signal(false);

    await TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot(), HeaderComponent],
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: NavigationConfigService, useValue: navigationConfigSpy },
        { provide: Router, useValue: routerSpy },
        { provide: ViewportService, useValue: { isMobile } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HeaderComponent);
    component = fixture.componentInstance;
    translateService = TestBed.inject(TranslateService);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display username and office', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.username')?.textContent).toContain('mifos');
    expect(compiled.querySelector('.office')?.textContent).toContain('Head Office');
  });

  it('moves the actions into an overflow menu on a narrow viewport', () => {
    // The counterpart to the case above: below the breakpoint those same controls are not in
    // the bar at all, and reaching them is what the overflow trigger is for.
    isMobile.set(true);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.username')).toBeNull();
    expect(compiled.querySelector('#header-overflow')).not.toBeNull();
    expect(compiled.querySelector('.page-title')).not.toBeNull();
  });

  it('should call logout and navigate', () => {
    component.logout();
    expect(authServiceSpy.logout).toHaveBeenCalled();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('should switch language', () => {
    spyOn(translateService, 'use');
    component.switchLanguage('hi');
    expect(translateService.use).toHaveBeenCalledWith('hi');
  });

  it('navigates to a page result via navigateByUrl', () => {
    component.onResultSelected({
      kind: 'nav',
      nav: { route: '/organization/offices', label: 'Offices' },
    });
    expect(routerSpy.navigateByUrl).toHaveBeenCalledWith('/organization/offices');
  });

  it('navigates to an entity result by type', () => {
    component.onResultSelected({
      kind: 'entity',
      entity: { entityType: 'LOAN', entityId: 42 } as never,
    });
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/loans/view', 42]);
  });

  it('prevents the mousedown default on a result item, so the searchbar never blurs to start the 150ms hide race', () => {
    // Drives `showResults` through the public entry point rather than reaching into the
    // (protected) signal directly; `searchResults` is set directly since the debounced
    // pipeline behind `onSearchInput` never resolves within a synchronous test.
    component.onSearchInput({ detail: { value: 'Offices' } } as unknown as Event);
    component.searchResults.set([
      { kind: 'nav', nav: { route: '/organization/offices', label: 'Offices' } },
    ]);
    fixture.detectChanges();

    const item = fixture.debugElement.query(By.css('ion-item'));
    const event = jasmine.createSpyObj('MouseEvent', ['preventDefault']);
    item.triggerEventHandler('mousedown', event);

    expect(event.preventDefault).toHaveBeenCalled();
  });
});
