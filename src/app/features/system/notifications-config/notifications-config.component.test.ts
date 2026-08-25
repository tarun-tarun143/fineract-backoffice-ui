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

import { createSpyObj, SpyObj } from '../../../testing/mocks';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NotificationsConfigComponent } from './notifications-config.component';
import { NotificationService } from '../../../api';
import { of } from 'rxjs';
import { provideTranslateTesting } from '../../../testing/i18n-testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

describe('NotificationsConfigComponent', () => {
  let component: NotificationsConfigComponent;
  let fixture: ComponentFixture<NotificationsConfigComponent>;
  let serviceSpy: SpyObj<NotificationService>;

  beforeEach(async () => {
    serviceSpy = createSpyObj(['getNotifications', 'putNotifications']);
    serviceSpy.getNotifications.mockReturnValue(
      of({
        pageItems: [
          { id: 1, content: 'Hello', isRead: false },
          { id: 2, content: 'World', isRead: true },
        ],
        totalFilteredRecords: 2,
      }) as unknown as ReturnType<NotificationService['getNotifications']>,
    );

    await TestBed.configureTestingModule({
      imports: [NotificationsConfigComponent],
      providers: [
        ...provideTranslateTesting(),
        { provide: NotificationService, useValue: serviceSpy },
        provideNoopAnimations(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(NotificationsConfigComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should load notifications on init', () => {
    expect(component.notifications()).toHaveLength(2);
  });

  it('should mark all read on action', () => {
    serviceSpy.putNotifications.mockReturnValue(
      of({}) as unknown as ReturnType<NotificationService['putNotifications']>,
    );
    component.onMarkAllRead();
    expect(serviceSpy.putNotifications).toHaveBeenCalled();
  });
});
