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
import { SmsFormComponent } from './sms-form.component';
import { SMSService } from '../../../api';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { provideTranslateTesting } from '../../../testing/i18n-testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

describe('SmsFormComponent', () => {
  let component: SmsFormComponent;
  let fixture: ComponentFixture<SmsFormComponent>;
  let serviceSpy: SpyObj<SMSService>;
  let routerSpy: SpyObj<Router>;

  beforeEach(async () => {
    serviceSpy = createSpyObj(['getSmsResourceId', 'postSms', 'putSmsResourceId']);
    routerSpy = createSpyObj(['navigate']);

    await TestBed.configureTestingModule({
      imports: [SmsFormComponent],
      providers: [
        ...provideTranslateTesting(),
        { provide: SMSService, useValue: serviceSpy },
        { provide: Router, useValue: routerSpy },
        { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({})) } },
        provideNoopAnimations(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SmsFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should post on create and navigate to the list', () => {
    serviceSpy.postSms.mockReturnValue(of({}) as unknown as ReturnType<SMSService['postSms']>);
    component.message.set('Hello');
    component.onSubmit();
    expect(serviceSpy.postSms).toHaveBeenCalled();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/system/sms']);
  });
});
