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
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { CodesService, DataTablesService, PostDataTablesRequest } from '../../../api';
import { provideIonicTesting } from '../../../testing/ionic-testing';
import { provideTranslateTesting } from '../../../testing/i18n-testing';
import { DatatablesFormComponent } from './datatables-form.component';

describe('DatatablesFormComponent', () => {
  let fixture: ComponentFixture<DatatablesFormComponent>;
  let component: DatatablesFormComponent;
  let datatablesServiceSpy: SpyObj<DataTablesService>;
  let codesServiceSpy: SpyObj<CodesService>;
  let routerSpy: SpyObj<Router>;

  async function configure(name: string | null = null): Promise<void> {
    datatablesServiceSpy = createSpyObj([
      'getDatatablesDatatable',
      'postDatatables',
      'putDatatablesDatatableName',
    ]);
    codesServiceSpy = createSpyObj(['getCodes']);
    routerSpy = createSpyObj(['navigate']);
    codesServiceSpy.getCodes.mockReturnValue(of([]) as unknown as Observable<never>);

    await TestBed.configureTestingModule({
      imports: [DatatablesFormComponent],
      providers: [
        provideIonicTesting(),
        ...provideTranslateTesting(),
        { provide: DataTablesService, useValue: datatablesServiceSpy },
        { provide: CodesService, useValue: codesServiceSpy },
        { provide: Router, useValue: routerSpy },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: { get: () => name },
            },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DatatablesFormComponent);
    component = fixture.componentInstance;
  }

  it('includes unique and indexed values in the create request', async () => {
    await configure();
    datatablesServiceSpy.postDatatables.mockReturnValue(of({}) as unknown as Observable<never>);
    fixture.detectChanges();

    expect(component.datatable().columns[0]).toEqual(
      expect.objectContaining({ unique: false, indexed: false }),
    );

    component.datatable.set({
      datatableName: 'client_identifiers',
      apptableName: 'm_client',
      multiRow: false,
      columns: [
        {
          name: 'external_reference',
          type: 'String',
          length: 64,
          mandatory: true,
          unique: true,
          indexed: true,
        },
      ],
    });

    component.onSubmit();

    const request = datatablesServiceSpy.postDatatables.mock.lastCall![0] as PostDataTablesRequest;
    expect(request.columns[0]).toEqual(expect.objectContaining({ unique: true, indexed: true }));
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/system/data-tables']);
  });

  it('maps unique and indexed values from an existing datatable', async () => {
    await configure('client_identifiers');
    datatablesServiceSpy.getDatatablesDatatable.mockReturnValue(
      of({
        registeredTableName: 'client_identifiers',
        applicationTableName: 'm_client',
        columnHeaderData: [
          {
            columnName: 'external_reference',
            columnDisplayType: 'STRING',
            isColumnNullable: false,
            isColumnUnique: true,
            isColumnIndexed: true,
            columnLength: 64,
          },
        ],
      }) as unknown as Observable<never>,
    );
    fixture.detectChanges();

    expect(component.isEditMode).toBe(true);
    expect(component.datatable().columns[0]).toEqual(
      expect.objectContaining({
        name: 'external_reference',
        mandatory: true,
        unique: true,
        indexed: true,
      }),
    );
  });
});
