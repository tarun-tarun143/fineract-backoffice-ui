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
import { SpmSurveysListComponent } from './spm-surveys-list.component';
import { SpmSurveysService } from '../../../api';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { provideTranslateTesting } from '../../../testing/i18n-testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

describe('SpmSurveysListComponent', () => {
  let component: SpmSurveysListComponent;
  let fixture: ComponentFixture<SpmSurveysListComponent>;
  let serviceSpy: SpyObj<SpmSurveysService>;
  let routerSpy: SpyObj<Router>;

  beforeEach(async () => {
    serviceSpy = createSpyObj(['getSurveys']);
    routerSpy = createSpyObj(['navigate']);
    serviceSpy.getSurveys.mockReturnValue(
      of([{ id: 1, key: 'PPI', name: 'Poverty Index' }]) as unknown as ReturnType<
        SpmSurveysService['getSurveys']
      >,
    );

    await TestBed.configureTestingModule({
      imports: [SpmSurveysListComponent],
      providers: [
        ...provideTranslateTesting(),
        { provide: SpmSurveysService, useValue: serviceSpy },
        { provide: Router, useValue: routerSpy },
        provideNoopAnimations(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SpmSurveysListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should load surveys on init', () => {
    expect(component).toBeTruthy();
    expect(serviceSpy.getSurveys).toHaveBeenCalled();
    expect(component.surveys()).toHaveLength(1);
  });

  it('should navigate to edit with the survey id', () => {
    component.onEdit({ id: 3, name: 'X' });
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/spm/surveys/edit', 3]);
  });

  it('should navigate to scorecards for a survey', () => {
    component.onScorecards({ id: 7, name: 'Y' });
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/spm/surveys', 7, 'scorecards']);
  });
});
