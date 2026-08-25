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
import { LikelihoodComponent } from './likelihood.component';
import { LikelihoodService } from '../../../api';
import { of } from 'rxjs';
import { provideTranslateTesting } from '../../../testing/i18n-testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

describe('LikelihoodComponent', () => {
  let component: LikelihoodComponent;
  let fixture: ComponentFixture<LikelihoodComponent>;
  let serviceSpy: SpyObj<LikelihoodService>;

  beforeEach(async () => {
    serviceSpy = createSpyObj(['getLikelihoodPpiName', 'putLikelihoodPpiNameLikelihoodId']);
    serviceSpy.getLikelihoodPpiName.mockReturnValue(
      of(
        JSON.stringify([{ id: 1, name: 'Likely', likelihood: 1.5, enabled: 100 }]),
      ) as unknown as ReturnType<LikelihoodService['getLikelihoodPpiName']>,
    );

    await TestBed.configureTestingModule({
      imports: [LikelihoodComponent],
      providers: [
        ...provideTranslateTesting(),
        { provide: LikelihoodService, useValue: serviceSpy },
        provideNoopAnimations(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LikelihoodComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should load and parse likelihoods', () => {
    component.ppiName = 'PPI_INDIA';
    component.load();
    expect(serviceSpy.getLikelihoodPpiName).toHaveBeenCalledWith('PPI_INDIA');
    expect(component.rows()).toHaveLength(1);
    expect(component.rows()[0].name).toBe('Likely');
  });

  it('should put the updated likelihood with a JSON string body', () => {
    serviceSpy.putLikelihoodPpiNameLikelihoodId.mockReturnValue(
      of('{}') as unknown as ReturnType<LikelihoodService['putLikelihoodPpiNameLikelihoodId']>,
    );
    component.ppiName = 'PPI_INDIA';
    component.onSave({ id: 7, likelihood: 2, enabled: 0 });
    expect(serviceSpy.putLikelihoodPpiNameLikelihoodId).toHaveBeenCalledWith(
      7,
      'PPI_INDIA',
      JSON.stringify({ likelihood: 2, enabled: 0 }),
    );
  });
});
