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
import { ExternalEventsComponent } from './external-events.component';
import { ExternalEventConfigurationService } from '../../../api';
import { of } from 'rxjs';
import { provideTranslateTesting } from '../../../testing/i18n-testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

describe('ExternalEventsComponent', () => {
  let component: ExternalEventsComponent;
  let fixture: ComponentFixture<ExternalEventsComponent>;
  let serviceSpy: SpyObj<ExternalEventConfigurationService>;

  beforeEach(async () => {
    serviceSpy = createSpyObj(['getExternaleventsConfiguration', 'putExternaleventsConfiguration']);
    serviceSpy.getExternaleventsConfiguration.mockReturnValue(
      of({
        externalEventConfiguration: [
          { type: 'LoanApprovedBusinessEvent', enabled: true },
          { type: 'LoanRejectedBusinessEvent', enabled: false },
        ],
      }) as unknown as ReturnType<
        ExternalEventConfigurationService['getExternaleventsConfiguration']
      >,
    );

    await TestBed.configureTestingModule({
      imports: [ExternalEventsComponent],
      providers: [
        ...provideTranslateTesting(),
        { provide: ExternalEventConfigurationService, useValue: serviceSpy },
        provideNoopAnimations(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ExternalEventsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should load events on init', () => {
    expect(component.events()).toHaveLength(2);
  });

  it('should put a map of toggles on save', () => {
    serviceSpy.putExternaleventsConfiguration.mockReturnValue(
      of({}) as unknown as ReturnType<
        ExternalEventConfigurationService['putExternaleventsConfiguration']
      >,
    );
    component.onSave();
    expect(serviceSpy.putExternaleventsConfiguration).toHaveBeenCalledWith({
      externalEventConfigurations: {
        LoanApprovedBusinessEvent: true,
        LoanRejectedBusinessEvent: false,
      },
    });
  });
});
