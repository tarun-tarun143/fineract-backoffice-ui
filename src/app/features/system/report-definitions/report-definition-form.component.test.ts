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
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { ReportDefinitionFormComponent } from './report-definition-form.component';
import { ReportsService } from '../../../api';
import { NotificationService } from '../../../core/services/notification.service';
import { provideFakeAdapters } from '../../../testing/adapters';

const CORE_REPORT = {
  id: 1,
  reportName: 'Client Listing',
  reportType: 'Table',
  reportCategory: 'Client',
  description: 'Seeded with the platform',
  reportSql: 'SELECT 1',
  coreReport: true,
  useReport: true,
  reportParameters: [],
};

const TENANT_REPORT = { ...CORE_REPORT, id: 2, reportName: 'Branch Arrears', coreReport: false };

describe('ReportDefinitionFormComponent', () => {
  let component: ReportDefinitionFormComponent;
  let fixture: ComponentFixture<ReportDefinitionFormComponent>;
  let reportsSpy: SpyObj<ReportsService>;

  async function build(routeId: string | null) {
    await TestBed.configureTestingModule({
      imports: [ReportDefinitionFormComponent],
      providers: [
        { provide: ReportsService, useValue: reportsSpy },
        { provide: NotificationService, useValue: createSpyObj(['success', 'error']) },
        { provide: Router, useValue: createSpyObj(['navigate']) },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: () => routeId } } },
        },
        ...provideFakeAdapters().providers,
        provideNoopAnimations(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ReportDefinitionFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(() => {
    reportsSpy = createSpyObj([
      'getReportsTemplate',
      'getReportsId',
      'postReports',
      'putReportsId',
    ]);
    reportsSpy.getReportsTemplate.mockReturnValue(
      of({
        allowedReportTypes: ['Table', 'Chart', 'SMS'],
        allowedReportSubTypes: ['Bar', 'Pie'],
      }) as never,
    );
    reportsSpy.putReportsId.mockReturnValue(of({}) as unknown as Observable<never>);
    reportsSpy.postReports.mockReturnValue(of({}) as unknown as Observable<never>);
  });

  it('sends only the in-use flag for a core report, because the platform refuses the rest', async () => {
    reportsSpy.getReportsId.mockReturnValue(of(CORE_REPORT) as unknown as Observable<never>);
    await build('1');

    expect(component.isCoreReport()).toBe(true);
    component.report.useReport = false;
    component.onSave();

    const [id, payload] = reportsSpy.putReportsId.mock.lastCall!;
    expect(id).toBe(1);
    expect(payload).toEqual({ useReport: false } as never);
  });

  it('sends the whole definition for a tenant report', async () => {
    reportsSpy.getReportsId.mockReturnValue(of(TENANT_REPORT) as unknown as Observable<never>);
    await build('2');

    component.report.description = 'edited';
    component.onSave();

    const payload = reportsSpy.putReportsId.mock.lastCall![1] as Record<string, unknown>;
    expect(payload['description']).toBe('edited');
    expect(payload['reportSql']).toBe('SELECT 1');
  });

  it('creates rather than updates when there is no id on the route', async () => {
    await build(null);

    component.report.reportName = 'New Report';
    component.report.reportType = 'Table';
    component.onSave();

    expect(reportsSpy.postReports).toHaveBeenCalled();
    expect(reportsSpy.putReportsId).not.toHaveBeenCalled();
  });

  it('will not create a report without a name and a type', async () => {
    await build(null);

    expect(component.canSave).toBe(false);
    component.report.reportName = 'New Report';
    expect(component.canSave).toBe(true);
  });
});
