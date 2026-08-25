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
import { EntityDataTableChecksFormComponent } from './entity-data-table-checks-form.component';
import { EntityDataTableService } from '../../../api';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { provideTranslateTesting } from '../../../testing/i18n-testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

describe('EntityDataTableChecksFormComponent', () => {
  let component: EntityDataTableChecksFormComponent;
  let fixture: ComponentFixture<EntityDataTableChecksFormComponent>;
  let serviceSpy: SpyObj<EntityDataTableService>;
  let routerSpy: SpyObj<Router>;

  beforeEach(async () => {
    serviceSpy = createSpyObj(['getEntityDatatableChecksTemplate', 'postEntityDatatableChecks']);
    routerSpy = createSpyObj(['navigate']);
    serviceSpy.getEntityDatatableChecksTemplate.mockReturnValue(
      of({ entities: ['m_client', 'm_loan'] }) as unknown as ReturnType<
        EntityDataTableService['getEntityDatatableChecksTemplate']
      >,
    );

    await TestBed.configureTestingModule({
      imports: [EntityDataTableChecksFormComponent],
      providers: [
        ...provideTranslateTesting(),
        { provide: EntityDataTableService, useValue: serviceSpy },
        { provide: Router, useValue: routerSpy },
        provideNoopAnimations(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(EntityDataTableChecksFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should load template entities on init', () => {
    expect(component).toBeTruthy();
    expect(serviceSpy.getEntityDatatableChecksTemplate).toHaveBeenCalled();
    expect(component.entityOptions()).toHaveLength(2);
  });

  it('should post on create and navigate to the list', () => {
    serviceSpy.postEntityDatatableChecks.mockReturnValue(
      of({}) as unknown as ReturnType<EntityDataTableService['postEntityDatatableChecks']>,
    );
    component.check = { entity: 'm_client', datatableName: 'dt', status: 100 };
    component.onSubmit();
    expect(serviceSpy.postEntityDatatableChecks).toHaveBeenCalled();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/system/entity-data-table-checks']);
  });
});
