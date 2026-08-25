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
import { ScorecardsComponent } from './scorecards.component';
import { ScoreCardService } from '../../../api';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { provideTranslateTesting } from '../../../testing/i18n-testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

describe('ScorecardsComponent', () => {
  let component: ScorecardsComponent;
  let fixture: ComponentFixture<ScorecardsComponent>;
  let serviceSpy: SpyObj<ScoreCardService>;

  beforeEach(async () => {
    serviceSpy = createSpyObj(['getSurveysScorecardsSurveyId']);
    serviceSpy.getSurveysScorecardsSurveyId.mockReturnValue(
      of([
        {
          id: 1,
          value: 5,
          createdOn: '2026-01-01',
          client: { displayName: 'John Doe' },
          question: { text: 'How many?' },
        },
      ]) as unknown as ReturnType<ScoreCardService['getSurveysScorecardsSurveyId']>,
    );

    await TestBed.configureTestingModule({
      imports: [ScorecardsComponent],
      providers: [
        ...provideTranslateTesting(),
        { provide: ScoreCardService, useValue: serviceSpy },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ surveyId: '4' }) } },
        },
        provideNoopAnimations(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ScorecardsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should load and flatten scorecards on init', () => {
    expect(component).toBeTruthy();
    expect(serviceSpy.getSurveysScorecardsSurveyId).toHaveBeenCalledWith(4);
    expect(component.rows()).toHaveLength(1);
    expect(component.rows()[0].client).toBe('John Doe');
    expect(component.rows()[0].question).toBe('How many?');
  });
});
