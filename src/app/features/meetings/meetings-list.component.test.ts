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
import { MeetingsListComponent } from './meetings-list.component';
import { MeetingsService } from '../../api';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { provideTranslateTesting } from '../../testing/i18n-testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

describe('MeetingsListComponent', () => {
  let component: MeetingsListComponent;
  let fixture: ComponentFixture<MeetingsListComponent>;
  let serviceSpy: SpyObj<MeetingsService>;
  let routerSpy: SpyObj<Router>;

  beforeEach(async () => {
    serviceSpy = createSpyObj([
      'getEntityTypeEntityIdMeetings',
      'deleteEntityTypeEntityIdMeetingsMeetingId',
    ]);
    routerSpy = createSpyObj(['navigate']);
    serviceSpy.getEntityTypeEntityIdMeetings.mockReturnValue(
      of([{ id: 1, meetingDate: '2026-01-15' }]) as unknown as ReturnType<
        MeetingsService['getEntityTypeEntityIdMeetings']
      >,
    );

    await TestBed.configureTestingModule({
      imports: [MeetingsListComponent],
      providers: [
        ...provideTranslateTesting(),
        { provide: MeetingsService, useValue: serviceSpy },
        { provide: Router, useValue: routerSpy },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: convertToParamMap({ entityType: 'groups', entityId: '1' }) },
          },
        },
        provideNoopAnimations(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MeetingsListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should load meetings on init', () => {
    expect(component).toBeTruthy();
    expect(serviceSpy.getEntityTypeEntityIdMeetings).toHaveBeenCalledWith('groups', 1);
    expect(component.meetings()).toHaveLength(1);
  });

  it('should navigate to edit with the entity and meeting ids', () => {
    component.onEdit({ id: 3 });
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/meetings', 'groups', 1, 'edit', 3]);
  });

  it('should delete after confirmation and reload', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    serviceSpy.deleteEntityTypeEntityIdMeetingsMeetingId.mockReturnValue(
      of({}) as unknown as ReturnType<MeetingsService['deleteEntityTypeEntityIdMeetingsMeetingId']>,
    );

    component.onDelete({ id: 5 });

    expect(serviceSpy.deleteEntityTypeEntityIdMeetingsMeetingId).toHaveBeenCalledWith(
      'groups',
      1,
      5,
    );
    expect(serviceSpy.getEntityTypeEntityIdMeetings).toHaveBeenCalledTimes(2);
  });

  it('should not delete when cancelled', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    component.onDelete({ id: 5 });
    expect(serviceSpy.deleteEntityTypeEntityIdMeetingsMeetingId).not.toHaveBeenCalled();
  });
});
