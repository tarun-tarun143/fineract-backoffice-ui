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
import { SchedulerJobHistoryComponent } from './scheduler-job-history.component';
import { SCHEDULERJOBService } from '../../../api';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { provideTranslateTesting } from '../../../testing/i18n-testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

describe('SchedulerJobHistoryComponent', () => {
  let component: SchedulerJobHistoryComponent;
  let fixture: ComponentFixture<SchedulerJobHistoryComponent>;
  let jobSpy: SpyObj<SCHEDULERJOBService>;
  let routerSpy: SpyObj<Router>;

  beforeEach(async () => {
    jobSpy = createSpyObj(['getJobsJobIdRunhistory']);
    routerSpy = createSpyObj(['navigate']);
    jobSpy.getJobsJobIdRunhistory.mockReturnValue(
      of({ pageItems: [{ id: 1, status: 'success' }] }) as unknown as ReturnType<
        SCHEDULERJOBService['getJobsJobIdRunhistory']
      >,
    );

    await TestBed.configureTestingModule({
      imports: [SchedulerJobHistoryComponent],
      providers: [
        ...provideTranslateTesting(),
        { provide: SCHEDULERJOBService, useValue: jobSpy },
        { provide: Router, useValue: routerSpy },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ id: '5' }) } },
        },
        provideNoopAnimations(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SchedulerJobHistoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should load run history for the job id', () => {
    expect(component).toBeTruthy();
    expect(component.jobId).toBe(5);
    expect(jobSpy.getJobsJobIdRunhistory).toHaveBeenCalledWith(5);
    expect(component.history()).toHaveLength(1);
  });

  it('should navigate back to the jobs list', () => {
    component.onBack();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/system/scheduler-jobs']);
  });
});
