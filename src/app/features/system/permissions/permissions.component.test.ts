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
import { PermissionsListComponent } from './permissions.component';
import { PermissionsService } from '../../../api';
import { of } from 'rxjs';
import { provideTranslateTesting } from '../../../testing/i18n-testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

describe('PermissionsListComponent', () => {
  let component: PermissionsListComponent;
  let fixture: ComponentFixture<PermissionsListComponent>;
  let serviceSpy: SpyObj<PermissionsService>;

  beforeEach(async () => {
    serviceSpy = createSpyObj(['getPermissions', 'putPermissions']);
    serviceSpy.getPermissions.mockReturnValue(
      of([
        { code: 'CREATE_CLIENT', grouping: 'portfolio', selected: false },
        { code: 'CREATE_LOAN', grouping: 'transaction', selected: true },
      ]) as unknown as ReturnType<PermissionsService['getPermissions']>,
    );
    serviceSpy.putPermissions.mockReturnValue(
      of({}) as unknown as ReturnType<PermissionsService['putPermissions']>,
    );

    await TestBed.configureTestingModule({
      imports: [PermissionsListComponent],
      providers: [
        ...provideTranslateTesting(),
        { provide: PermissionsService, useValue: serviceSpy },
        provideNoopAnimations(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PermissionsListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should load and group permissions on init', () => {
    expect(component).toBeTruthy();
    expect(serviceSpy.getPermissions).toHaveBeenCalled();
    expect(component.groupNames()).toEqual(['portfolio', 'transaction']);
    expect(component.grouped()['portfolio']).toHaveLength(1);
  });

  it('should track toggled permissions and save them', () => {
    component.onToggle({ code: 'CREATE_CLIENT', selected: true });
    expect(component.changed['CREATE_CLIENT']).toBe(true);

    component.onSave();
    expect(serviceSpy.putPermissions).toHaveBeenCalledWith({
      permissions: { CREATE_CLIENT: true },
    });
  });
});
