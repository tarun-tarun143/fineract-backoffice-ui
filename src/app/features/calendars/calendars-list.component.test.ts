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

import { createSpyObj, SpyObj } from '../../testing/mocks';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CalendarsListComponent } from './calendars-list.component';
import { CalendarService } from '../../api';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of, throwError } from 'rxjs';
import { provideTranslateTesting } from '../../testing/i18n-testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

describe('CalendarsListComponent', () => {
  let component: CalendarsListComponent;
  let fixture: ComponentFixture<CalendarsListComponent>;
  let serviceSpy: SpyObj<CalendarService>;
  let routerSpy: SpyObj<Router>;

  beforeEach(async () => {
    serviceSpy = createSpyObj([
      'getEntityTypeEntityIdCalendars',
      'deleteEntityTypeEntityIdCalendarsCalendarId',
    ]);
    routerSpy = createSpyObj(['navigate']);
    serviceSpy.getEntityTypeEntityIdCalendars.mockReturnValue(
      of([{ id: 1, title: 'Weekly Meeting', startDate: '2026-01-15' }]) as unknown as ReturnType<
        CalendarService['getEntityTypeEntityIdCalendars']
      >,
    );

    await TestBed.configureTestingModule({
      imports: [CalendarsListComponent],
      providers: [
        ...provideTranslateTesting(),
        { provide: CalendarService, useValue: serviceSpy },
        { provide: Router, useValue: routerSpy },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: convertToParamMap({ entityType: 'centers', entityId: '2' }) },
          },
        },
        provideNoopAnimations(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CalendarsListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should load calendars on init', () => {
    expect(component).toBeTruthy();
    expect(serviceSpy.getEntityTypeEntityIdCalendars).toHaveBeenCalledWith('centers', 2);
    expect(component.calendars()).toHaveLength(1);
  });

  it('should navigate to edit with the entity and calendar ids', () => {
    component.onEdit({ id: 3 });
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/calendars', 'centers', 2, 'edit', 3]);
  });

  it('should delete after confirmation and reload', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    serviceSpy.deleteEntityTypeEntityIdCalendarsCalendarId.mockReturnValue(
      of({}) as unknown as ReturnType<
        CalendarService['deleteEntityTypeEntityIdCalendarsCalendarId']
      >,
    );

    component.onDelete({ id: 5 });

    expect(serviceSpy.deleteEntityTypeEntityIdCalendarsCalendarId).toHaveBeenCalledWith(
      'centers',
      2,
      5,
    );
    expect(serviceSpy.getEntityTypeEntityIdCalendars).toHaveBeenCalledTimes(2);
  });

  it('should not delete when cancelled', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    component.onDelete({ id: 5 });
    expect(serviceSpy.deleteEntityTypeEntityIdCalendarsCalendarId).not.toHaveBeenCalled();
  });

  it('reports a failed load instead of an empty list', () => {
    serviceSpy.getEntityTypeEntityIdCalendars.mockReturnValue(
      throwError(() => new Error('boom')) as unknown as ReturnType<
        CalendarService['getEntityTypeEntityIdCalendars']
      >,
    );

    component.load();

    expect(component.hasError()).toBe(true);
    expect(component.calendars()).toHaveLength(0);
  });

  it('clears the error after a successful retry', () => {
    serviceSpy.getEntityTypeEntityIdCalendars.mockReturnValue(
      throwError(() => new Error('boom')) as unknown as ReturnType<
        CalendarService['getEntityTypeEntityIdCalendars']
      >,
    );
    component.load();
    expect(component.hasError()).toBe(true);

    serviceSpy.getEntityTypeEntityIdCalendars.mockReturnValue(
      of([{ id: 1, title: 'Weekly Meeting', startDate: '2026-01-15' }]) as unknown as ReturnType<
        CalendarService['getEntityTypeEntityIdCalendars']
      >,
    );

    component.onRetry();

    expect(component.hasError()).toBe(false);
    expect(component.calendars()).toHaveLength(1);
  });
});
