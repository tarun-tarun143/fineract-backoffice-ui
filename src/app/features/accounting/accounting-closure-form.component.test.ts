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
import { AccountingClosureFormComponent } from './accounting-closure-form.component';
import {
  AccountingClosureService,
  OfficesService,
  GetOfficesResponse,
  PostGlClosuresResponse,
} from '../../api';
import { Router } from '@angular/router';
import { of, Observable } from 'rxjs';
import { HttpEvent } from '@angular/common/http';
import { provideTranslateTesting } from '../../testing/i18n-testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

describe('AccountingClosureFormComponent', () => {
  let component: AccountingClosureFormComponent;
  let fixture: ComponentFixture<AccountingClosureFormComponent>;
  let closureServiceSpy: SpyObj<AccountingClosureService>;
  let officeServiceSpy: SpyObj<OfficesService>;
  let routerSpy: SpyObj<Router>;

  beforeEach(async () => {
    closureServiceSpy = createSpyObj(['postGlclosures']);
    officeServiceSpy = createSpyObj(['getOffices']);
    routerSpy = createSpyObj(['navigate']);

    await TestBed.configureTestingModule({
      imports: [AccountingClosureFormComponent],
      providers: [
        ...provideTranslateTesting(),
        { provide: AccountingClosureService, useValue: closureServiceSpy },
        { provide: OfficesService, useValue: officeServiceSpy },
        { provide: Router, useValue: routerSpy },
        provideNoopAnimations(),
      ],
    }).compileComponents();
    officeServiceSpy.getOffices.mockReturnValue(
      of([]) as unknown as Observable<HttpEvent<GetOfficesResponse[]>>,
    );
    fixture = TestBed.createComponent(AccountingClosureFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should format payload correctly on submission', () => {
    component.request.officeId = 1;
    component.closingDate = '2026-05-31';
    component.request.comments = 'Monthly closure';

    closureServiceSpy.postGlclosures.mockReturnValue(
      of({}) as unknown as Observable<HttpEvent<PostGlClosuresResponse>>,
    );

    component.onSubmit();

    expect(closureServiceSpy.postGlclosures).toHaveBeenCalledWith(
      expect.objectContaining({
        officeId: 1,
        closingDate: '2026-05-31',
        comments: 'Monthly closure',
        dateFormat: 'yyyy-MM-dd',
        locale: 'en',
      }),
    );
  });
});
