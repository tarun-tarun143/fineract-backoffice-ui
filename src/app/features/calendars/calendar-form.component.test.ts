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
import { CalendarFormComponent } from './calendar-form.component';
import { CalendarService } from '../../api';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { provideTranslateTesting } from '../../testing/i18n-testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

describe('CalendarFormComponent', () => {
  let component: CalendarFormComponent;
  let fixture: ComponentFixture<CalendarFormComponent>;
  let serviceSpy: SpyObj<CalendarService>;
  let routerSpy: SpyObj<Router>;

  beforeEach(async () => {
    serviceSpy = createSpyObj([
      'getEntityTypeEntityIdCalendarsTemplate',
      'getEntityTypeEntityIdCalendarsCalendarId',
      'postEntityTypeEntityIdCalendars',
      'putEntityTypeEntityIdCalendarsCalendarId',
    ]);
    routerSpy = createSpyObj(['navigate']);
    serviceSpy.getEntityTypeEntityIdCalendarsTemplate.mockReturnValue(
      of({ calendarTypeOptions: [{ id: 1, value: 'Collection' }] }) as unknown as ReturnType<
        CalendarService['getEntityTypeEntityIdCalendarsTemplate']
      >,
    );

    await TestBed.configureTestingModule({
      imports: [CalendarFormComponent],
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

    fixture = TestBed.createComponent(CalendarFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should load template options on init', () => {
    expect(component).toBeTruthy();
    expect(serviceSpy.getEntityTypeEntityIdCalendarsTemplate).toHaveBeenCalledWith('centers', 2);
    expect(component.typeOptions()).toHaveLength(1);
  });

  it('should post on create and navigate to the list', () => {
    serviceSpy.postEntityTypeEntityIdCalendars.mockReturnValue(
      of({}) as unknown as ReturnType<CalendarService['postEntityTypeEntityIdCalendars']>,
    );
    component.title.set('Weekly');
    component.startDate.set('2026-01-15');
    component.typeId.set('1');
    component.onSubmit();
    expect(serviceSpy.postEntityTypeEntityIdCalendars).toHaveBeenCalledWith(
      'centers',
      2,
      expect.objectContaining({ title: 'Weekly' }),
    );
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/calendars', 'centers', 2]);
  });
});
