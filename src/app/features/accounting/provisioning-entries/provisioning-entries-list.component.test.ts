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
import { ProvisioningEntriesListComponent } from './provisioning-entries-list.component';
import { ProvisioningEntriesService } from '../../../api';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { provideTranslateTesting } from '../../../testing/i18n-testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

describe('ProvisioningEntriesListComponent', () => {
  let component: ProvisioningEntriesListComponent;
  let fixture: ComponentFixture<ProvisioningEntriesListComponent>;
  let serviceSpy: SpyObj<ProvisioningEntriesService>;
  let routerSpy: SpyObj<Router>;

  beforeEach(async () => {
    serviceSpy = createSpyObj(['getProvisioningentries']);
    routerSpy = createSpyObj(['navigate']);
    serviceSpy.getProvisioningentries.mockReturnValue(
      of({
        pageItems: [{ id: 1, createdUser: 'admin', reservedAmount: 1000 }],
        totalFilteredRecords: 1,
      }) as unknown as ReturnType<ProvisioningEntriesService['getProvisioningentries']>,
    );

    await TestBed.configureTestingModule({
      imports: [ProvisioningEntriesListComponent],
      providers: [
        ...provideTranslateTesting(),
        { provide: ProvisioningEntriesService, useValue: serviceSpy },
        { provide: Router, useValue: routerSpy },
        provideNoopAnimations(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProvisioningEntriesListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should load entries on init', () => {
    expect(component).toBeTruthy();
    expect(serviceSpy.getProvisioningentries).toHaveBeenCalled();
    expect(component.entries()).toHaveLength(1);
  });

  it('should navigate to create', () => {
    component.onCreate();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/accounting/provisioning-entries/create']);
  });
});
