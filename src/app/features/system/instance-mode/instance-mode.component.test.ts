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
import { InstanceModeComponent } from './instance-mode.component';
import { InstanceModeService } from '../../../api';
import { of } from 'rxjs';
import { provideTranslateTesting } from '../../../testing/i18n-testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

describe('InstanceModeComponent', () => {
  let component: InstanceModeComponent;
  let fixture: ComponentFixture<InstanceModeComponent>;
  let serviceSpy: SpyObj<InstanceModeService>;

  beforeEach(async () => {
    serviceSpy = createSpyObj(['putInstanceMode']);

    await TestBed.configureTestingModule({
      imports: [InstanceModeComponent],
      providers: [
        ...provideTranslateTesting(),
        { provide: InstanceModeService, useValue: serviceSpy },
        provideNoopAnimations(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(InstanceModeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should put the instance mode on save', () => {
    serviceSpy.putInstanceMode.mockReturnValue(
      of({}) as unknown as ReturnType<InstanceModeService['putInstanceMode']>,
    );
    component.mode.writeEnabled = false;
    component.onSave();
    expect(serviceSpy.putInstanceMode).toHaveBeenCalledWith(
      expect.objectContaining({ writeEnabled: false }) as never,
    );
  });
});
