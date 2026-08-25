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
import { RolesListComponent } from './roles-list.component';
import { RolesService, GetRolesResponse } from '../../../api';
import { Router } from '@angular/router';
import { of, throwError, Observable } from 'rxjs';
import { provideTranslateTesting } from '../../../testing/i18n-testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

describe('RolesListComponent', () => {
  let component: RolesListComponent;
  let fixture: ComponentFixture<RolesListComponent>;
  let rolesServiceSpy: SpyObj<RolesService>;
  let routerSpy: SpyObj<Router>;

  beforeEach(async () => {
    rolesServiceSpy = createSpyObj(['getRoles']);
    routerSpy = createSpyObj(['navigate']);

    rolesServiceSpy.getRoles.mockReturnValue(of([]) as unknown as Observable<never>);

    await TestBed.configureTestingModule({
      imports: [RolesListComponent],
      providers: [
        ...provideTranslateTesting(),
        { provide: RolesService, useValue: rolesServiceSpy },
        { provide: Router, useValue: routerSpy },
        provideNoopAnimations(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RolesListComponent);
    component = fixture.componentInstance;
  });

  it('should create and load roles on init', () => {
    const mockRoles = [
      { id: 1, name: 'Admin', description: 'Administrator' },
      { id: 2, name: 'User', description: 'Regular User' },
    ];
    rolesServiceSpy.getRoles.mockReturnValue(of(mockRoles) as unknown as Observable<never>);

    fixture.detectChanges();

    expect(component).toBeTruthy();
    expect(rolesServiceSpy.getRoles).toHaveBeenCalled();
    expect(component.roles()).toEqual(mockRoles as unknown as GetRolesResponse[]);
  });

  it('should handle error when loading roles', () => {
    rolesServiceSpy.getRoles.mockReturnValue(
      throwError(() => new Error('Error')) as unknown as Observable<never>,
    );
    vi.spyOn(console, 'error');

    fixture.detectChanges();

    expect(component.roles()).toEqual([]);
    expect(console.error).toHaveBeenCalledWith('Failed to load roles', expect.any(Error));
  });

  it('should navigate to create role page', () => {
    component.onCreateRole();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/security/roles/create']);
  });

  it('should navigate to edit role page', () => {
    const mockRole = { id: 10, name: 'Officer' };
    component.onEditRole(mockRole as unknown as GetRolesResponse);
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/security/roles/edit', 10]);
  });
});
