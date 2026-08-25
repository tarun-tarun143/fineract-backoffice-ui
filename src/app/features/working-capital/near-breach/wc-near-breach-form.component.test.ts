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
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of } from 'rxjs';

import { WcNearBreachFormComponent } from './wc-near-breach-form.component';
import { WorkingCapitalBreachService, WorkingCapitalNearBreachService } from '../../../api';
import { createSpyObj, SpyObj } from '../../../testing/mocks';
import { provideTranslateTesting } from '../../../testing/i18n-testing';

describe('WcNearBreachFormComponent', () => {
  let component: WcNearBreachFormComponent;
  let fixture: ComponentFixture<WcNearBreachFormComponent>;
  let serviceSpy: SpyObj<WorkingCapitalNearBreachService>;
  let breachServiceSpy: SpyObj<WorkingCapitalBreachService>;
  let routerSpy: SpyObj<Router>;

  beforeEach(async () => {
    serviceSpy = createSpyObj([
      'getWorkingCapitalNearBreachBreachId',
      'postWorkingCapitalNearBreach',
      'putWorkingCapitalNearBreachBreachId',
    ]);

    breachServiceSpy = createSpyObj(['getWorkingCapitalBreachTemplate']);

    breachServiceSpy.getWorkingCapitalBreachTemplate.mockReturnValue(
      of({
        breachFrequencyTypeOptions: [],
      }) as unknown as ReturnType<WorkingCapitalBreachService['getWorkingCapitalBreachTemplate']>,
    );

    routerSpy = createSpyObj(['navigate']);

    await TestBed.configureTestingModule({
      imports: [WcNearBreachFormComponent],
      providers: [
        {
          provide: WorkingCapitalNearBreachService,
          useValue: serviceSpy,
        },
        {
          provide: WorkingCapitalBreachService,
          useValue: breachServiceSpy,
        },
        {
          provide: Router,
          useValue: routerSpy,
        },
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap({})),
          },
        },
        provideNoopAnimations(),
        ...provideTranslateTesting(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(WcNearBreachFormComponent);
    component = fixture.componentInstance;

    fixture.detectChanges();
  });

  it('should post on create and navigate to the list', () => {
    serviceSpy.postWorkingCapitalNearBreach.mockReturnValue(
      of({}) as unknown as ReturnType<
        WorkingCapitalNearBreachService['postWorkingCapitalNearBreach']
      >,
    );

    component.item.set({
      nearBreachName: 'Warn',
      nearBreachThreshold: 75,
    });

    component.onSubmit();

    expect(serviceSpy.postWorkingCapitalNearBreach).toHaveBeenCalled();

    expect(routerSpy.navigate).toHaveBeenCalledWith(['/working-capital/near-breach']);
  });
});
