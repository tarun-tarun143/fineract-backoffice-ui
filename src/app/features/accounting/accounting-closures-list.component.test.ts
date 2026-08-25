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
import { AccountingClosuresListComponent } from './accounting-closures-list.component';
import {
  AccountingClosureService,
  GetGlClosureResponse,
  DeleteGlClosuresResponse,
} from '../../api';
import { Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { provideTranslateTesting } from '../../testing/i18n-testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { HttpEvent } from '@angular/common/http';

describe('AccountingClosuresListComponent', () => {
  let component: AccountingClosuresListComponent;
  let fixture: ComponentFixture<AccountingClosuresListComponent>;
  let closureServiceSpy: SpyObj<AccountingClosureService>;
  let routerSpy: SpyObj<Router>;

  beforeEach(async () => {
    closureServiceSpy = createSpyObj(['getGlclosures', 'deleteGlclosuresGlClosureId']);
    routerSpy = createSpyObj(['navigate']);

    await TestBed.configureTestingModule({
      imports: [AccountingClosuresListComponent],
      providers: [
        ...provideTranslateTesting(),
        { provide: AccountingClosureService, useValue: closureServiceSpy },
        { provide: Router, useValue: routerSpy },
        provideNoopAnimations(),
      ],
    }).compileComponents();

    closureServiceSpy.getGlclosures.mockReturnValue(
      of([]) as unknown as Observable<HttpEvent<GetGlClosureResponse[]>>,
    );
    fixture = TestBed.createComponent(AccountingClosuresListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load closures on init', () => {
    expect(closureServiceSpy.getGlclosures).toHaveBeenCalled();
  });

  it('should navigate to create on onCreateClosure', () => {
    component.onCreateClosure();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/accounting/closures/create']);
  });

  it('should delete closure when confirmed', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    closureServiceSpy.deleteGlclosuresGlClosureId.mockReturnValue(
      of({}) as unknown as Observable<HttpEvent<DeleteGlClosuresResponse>>,
    );

    component.onDeleteClosure({ id: 1 } as unknown as GetGlClosureResponse);

    expect(closureServiceSpy.deleteGlclosuresGlClosureId).toHaveBeenCalledWith(1);
    expect(closureServiceSpy.getGlclosures).toHaveBeenCalledTimes(2);
  });
});
