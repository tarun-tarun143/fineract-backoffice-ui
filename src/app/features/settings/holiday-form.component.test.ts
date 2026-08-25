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
import { HolidayFormComponent } from './holiday-form.component';
import { HolidaysService, OfficesService } from '../../api';
import { Router } from '@angular/router';
import { of, Observable } from 'rxjs';
import { provideTranslateTesting } from '../../testing/i18n-testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { NotificationService } from '../../core/services/notification.service';

describe('HolidayFormComponent', () => {
  let component: HolidayFormComponent;
  let fixture: ComponentFixture<HolidayFormComponent>;
  let holidaysServiceSpy: SpyObj<HolidaysService>;
  let officesServiceSpy: SpyObj<OfficesService>;
  let routerSpy: SpyObj<Router>;
  let notificationsSpy: SpyObj<NotificationService>;

  beforeEach(async () => {
    holidaysServiceSpy = createSpyObj(['getHolidaysTemplate', 'postHolidays']);
    officesServiceSpy = createSpyObj(['getOffices']);
    routerSpy = createSpyObj(['navigate']);
    notificationsSpy = createSpyObj<NotificationService>(['success', 'error', 'show']);

    officesServiceSpy.getOffices.mockReturnValue(
      of([{ id: 1, name: 'Head Office' }]) as unknown as Observable<never>,
    );
    holidaysServiceSpy.getHolidaysTemplate.mockReturnValue(
      of([
        { id: 1, value: 'Reschedule to next repayment date' },
        { id: 2, value: 'Reschedule to specified date' },
      ]) as unknown as Observable<never>,
    );

    await TestBed.configureTestingModule({
      imports: [HolidayFormComponent],
      providers: [
        ...provideTranslateTesting(),
        { provide: HolidaysService, useValue: holidaysServiceSpy },
        { provide: OfficesService, useValue: officesServiceSpy },
        { provide: Router, useValue: routerSpy },
        { provide: NotificationService, useValue: notificationsSpy },
        provideNoopAnimations(),
      ],
    })
      .overrideComponent(HolidayFormComponent, {
        add: {
          providers: [{ provide: NotificationService, useValue: notificationsSpy }],
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(HolidayFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and load initial templates and offices', () => {
    expect(component).toBeTruthy();
    expect(officesServiceSpy.getOffices).toHaveBeenCalledWith(true);
    expect(holidaysServiceSpy.getHolidaysTemplate).toHaveBeenCalled();
    expect(component.offices()).toEqual([{ id: 1, name: 'Head Office' }]);
    expect(component.reschedulingTypeOptions()).toHaveLength(2);
  });

  it('should submit new holiday form successfully', () => {
    holidaysServiceSpy.postHolidays.mockReturnValue(of({}) as unknown as Observable<never>);
    component.holiday = {
      name: 'Christmas',
      description: 'Merry Christmas',
    };
    component.fromDate = '2026-12-25';
    component.toDate = '2026-12-26';
    component.selectedOfficeIds = [1];
    component.reschedulingType = 2;
    component.repaymentsRescheduledTo = '2026-12-28';

    component.onSubmit();

    expect(component.isSaving()).toBe(true);
    expect(holidaysServiceSpy.postHolidays).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Christmas',
        description: 'Merry Christmas',
        fromDate: '25 December 2026',
        toDate: '26 December 2026',
        offices: [{ officeId: 1 }],
        reschedulingType: 2,
        repaymentsRescheduledTo: '28 December 2026',
      }),
    );
    expect(notificationsSpy.success).toHaveBeenCalledWith('Holiday created successfully');
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/settings/holidays']);
  });

  it('should handle cancel action', () => {
    component.onCancel();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/settings/holidays']);
  });
});
