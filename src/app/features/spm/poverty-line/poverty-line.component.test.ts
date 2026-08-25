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
import { PovertyLineComponent } from './poverty-line.component';
import { PovertyLineService } from '../../../api';
import { of } from 'rxjs';
import { provideTranslateTesting } from '../../../testing/i18n-testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

describe('PovertyLineComponent', () => {
  let component: PovertyLineComponent;
  let fixture: ComponentFixture<PovertyLineComponent>;
  let serviceSpy: SpyObj<PovertyLineService>;

  beforeEach(async () => {
    serviceSpy = createSpyObj(['getPovertyLinePpiName']);
    serviceSpy.getPovertyLinePpiName.mockReturnValue(
      of(
        JSON.stringify([{ scoreFrom: 0, scoreTo: 10, povertyLine: 100, enabled: true }]),
      ) as unknown as ReturnType<PovertyLineService['getPovertyLinePpiName']>,
    );

    await TestBed.configureTestingModule({
      imports: [PovertyLineComponent],
      providers: [
        ...provideTranslateTesting(),
        { provide: PovertyLineService, useValue: serviceSpy },
        provideNoopAnimations(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PovertyLineComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should not load without a ppi name', () => {
    component.ppiName = '';
    component.load();
    expect(serviceSpy.getPovertyLinePpiName).not.toHaveBeenCalled();
  });

  it('should load and parse poverty-line rows', () => {
    component.ppiName = 'PPI_INDIA';
    component.load();
    expect(serviceSpy.getPovertyLinePpiName).toHaveBeenCalledWith('PPI_INDIA');
    expect(component.rows()).toHaveLength(1);
    expect(component.rows()[0].povertyLine).toBe(100);
  });
});
