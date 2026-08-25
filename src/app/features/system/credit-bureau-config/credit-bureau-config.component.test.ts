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
import { CreditBureauConfigComponent } from './credit-bureau-config.component';
import { CreditBureauConfigurationService } from '../../../api';
import { of } from 'rxjs';
import { provideTranslateTesting } from '../../../testing/i18n-testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

describe('CreditBureauConfigComponent', () => {
  let component: CreditBureauConfigComponent;
  let fixture: ComponentFixture<CreditBureauConfigComponent>;
  let serviceSpy: SpyObj<CreditBureauConfigurationService>;

  beforeEach(async () => {
    serviceSpy = createSpyObj([
      'getCreditBureauConfiguration',
      'getCreditBureauConfigurationLoanProduct',
    ]);
    serviceSpy.getCreditBureauConfiguration.mockReturnValue(
      of(
        JSON.stringify([{ id: 1, name: 'Equifax', product: 'Thin file' }]),
      ) as unknown as ReturnType<CreditBureauConfigurationService['getCreditBureauConfiguration']>,
    );
    serviceSpy.getCreditBureauConfigurationLoanProduct.mockReturnValue(
      of(
        JSON.stringify([{ loanProductName: 'Microloan', organisationCreditBureauId: 5 }]),
      ) as unknown as ReturnType<
        CreditBureauConfigurationService['getCreditBureauConfigurationLoanProduct']
      >,
    );

    await TestBed.configureTestingModule({
      imports: [CreditBureauConfigComponent],
      providers: [
        ...provideTranslateTesting(),
        { provide: CreditBureauConfigurationService, useValue: serviceSpy },
        provideNoopAnimations(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CreditBureauConfigComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should load and parse credit bureaus on init', () => {
    expect(component).toBeTruthy();
    expect(serviceSpy.getCreditBureauConfiguration).toHaveBeenCalled();
    expect(component.bureaus()).toHaveLength(1);
    expect(component.bureaus()[0].name).toBe('Equifax');
  });

  it('should load and parse loan-product mappings on init', () => {
    expect(serviceSpy.getCreditBureauConfigurationLoanProduct).toHaveBeenCalled();
    expect(component.mappings()).toHaveLength(1);
    expect(component.mappings()[0].organisationCreditBureauId).toBe(5);
  });
});
