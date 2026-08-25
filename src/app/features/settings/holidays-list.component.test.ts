/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  See the License for the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
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
import { HolidaysListComponent } from './holidays-list.component';
import { HolidaysService, OfficesService, GetHolidaysResponse } from '../../api';
import { Router } from '@angular/router';
import { of, throwError, Observable } from 'rxjs';
import { provideTranslateTesting } from '../../testing/i18n-testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { NotificationService } from '../../core/services/notification.service';

import { provideIonicTesting } from '../../testing/ionic-testing';
import { DialogService } from '../../core/services/dialog.service';

describe('HolidaysListComponent', () => {
  let component: HolidaysListComponent;
  let fixture: ComponentFixture<HolidaysListComponent>;
  let holidaysServiceSpy: SpyObj<HolidaysService>;
  let officesServiceSpy: SpyObj<OfficesService>;
  let routerSpy: SpyObj<Router>;
  let dialogSpy: SpyObj<DialogService>;
  let notificationsSpy: SpyObj<NotificationService>;

  beforeEach(async () => {
    holidaysServiceSpy = createSpyObj(['getHolidays', 'postHolidaysHolidayId']);
    officesServiceSpy = createSpyObj(['getOffices']);
    routerSpy = createSpyObj(['navigate']);
    dialogSpy = createSpyObj<DialogService>(['open', 'confirm']);
    notificationsSpy = createSpyObj<NotificationService>(['success', 'error', 'show']);

    officesServiceSpy.getOffices.mockReturnValue(
      of([{ id: 1, name: 'Head Office' }]) as unknown as Observable<never>,
    );
    holidaysServiceSpy.getHolidays.mockReturnValue(of([]) as unknown as Observable<never>);

    await TestBed.configureTestingModule({
      imports: [HolidaysListComponent],
      providers: [
        ...provideTranslateTesting(),
        provideIonicTesting(),
        { provide: HolidaysService, useValue: holidaysServiceSpy },
        { provide: OfficesService, useValue: officesServiceSpy },
        { provide: Router, useValue: routerSpy },
        { provide: DialogService, useValue: dialogSpy },
        { provide: NotificationService, useValue: notificationsSpy },
        provideNoopAnimations(),
      ],
    })
      .overrideComponent(HolidaysListComponent, {
        add: {
          providers: [
            { provide: DialogService, useValue: dialogSpy },
            { provide: NotificationService, useValue: notificationsSpy },
          ],
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(HolidaysListComponent);
    component = fixture.componentInstance;
  });

  it('should create and load offices and holidays on init', () => {
    const mockHolidays = [
      {
        id: 1,
        name: 'New Year',
        fromDate: [2026, 1, 1] as unknown as number[],
        toDate: [2026, 1, 1] as unknown as number[],
        status: { code: 'holidayStatusType.active' },
      },
    ];
    holidaysServiceSpy.getHolidays.mockReturnValue(
      of(mockHolidays) as unknown as Observable<never>,
    );

    fixture.detectChanges();

    expect(component).toBeTruthy();
    expect(officesServiceSpy.getOffices).toHaveBeenCalledWith(true);
    expect(holidaysServiceSpy.getHolidays).toHaveBeenCalledWith(1);
    expect(component.holidays()).toEqual(mockHolidays as unknown as GetHolidaysResponse[]);
  });

  it('should load holidays for a different office on change', () => {
    fixture.detectChanges();
    component.onOfficeChange(5);
    expect(component.selectedOfficeId()).toBe(5);
    expect(holidaysServiceSpy.getHolidays).toHaveBeenCalledWith(5);
  });

  it('should navigate to create holiday page', () => {
    component.onCreateHoliday();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/settings/holidays/create']);
  });

  it('should format array date correctly', () => {
    expect(component.formatArrayDate([2026, 10, 5])).toBe('2026-10-05');
    expect(component.formatArrayDate(null)).toBe('-');
  });

  it('should activate holiday on dialog confirmation', async () => {
    fixture.detectChanges();
    const holiday = {
      id: 10,
      name: 'Holiday to activate',
      status: { code: 'holidayStatusType.pending.for.activation' },
    };
    const modalControllerSpy = createSpyObj(['afterClosed']);
    modalControllerSpy.afterClosed.mockReturnValue(of(true));
    dialogSpy.open.mockResolvedValue(true);
    holidaysServiceSpy.postHolidaysHolidayId.mockReturnValue(
      of({}) as unknown as Observable<never>,
    );

    await component.onActivateHoliday(holiday);

    expect(dialogSpy.open).toHaveBeenCalled();
    expect(holidaysServiceSpy.postHolidaysHolidayId).toHaveBeenCalledWith(10, {}, 'activate');
    expect(notificationsSpy.success).toHaveBeenCalledWith('Holiday activated successfully');
  });

  it('should handle activation error', async () => {
    fixture.detectChanges();
    const holiday = {
      id: 10,
      name: 'Holiday to activate',
      status: { code: 'holidayStatusType.pending.for.activation' },
    };
    const modalControllerSpy = createSpyObj(['afterClosed']);
    modalControllerSpy.afterClosed.mockReturnValue(of(true));
    dialogSpy.open.mockResolvedValue(true);
    holidaysServiceSpy.postHolidaysHolidayId.mockReturnValue(
      throwError(() => new Error('Error')) as unknown as Observable<never>,
    );
    vi.spyOn(console, 'error');

    await component.onActivateHoliday(holiday);

    expect(console.error).toHaveBeenCalled();
    expect(notificationsSpy.error).toHaveBeenCalledWith('Failed to activate holiday');
  });
});
