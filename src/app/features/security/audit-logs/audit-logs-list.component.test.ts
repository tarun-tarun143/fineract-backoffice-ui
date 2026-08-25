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
import { AuditLogsListComponent } from './audit-logs-list.component';
import { AuditsService } from '../../../api';
import { of, Observable } from 'rxjs';
import { provideTranslateTesting } from '../../../testing/i18n-testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { PageEvent, SortEvent } from '../../../shared/models/table.model';
import { provideIonicTesting } from '../../../testing/ionic-testing';
import { DialogService } from '../../../core/services/dialog.service';
import { DOWNLOAD, DownloadAdapter } from '../../../core/adapters';

describe('AuditLogsListComponent', () => {
  let component: AuditLogsListComponent;
  let fixture: ComponentFixture<AuditLogsListComponent>;
  let auditsServiceSpy: SpyObj<AuditsService>;
  let dialogSpy: SpyObj<DialogService>;
  let downloadSpy: SpyObj<DownloadAdapter>;

  const MOCK_PAYLOAD = '{"key":"value"}';

  beforeEach(async () => {
    auditsServiceSpy = createSpyObj(['getAudits']);
    dialogSpy = createSpyObj<DialogService>(['open', 'confirm']);
    downloadSpy = createSpyObj<DownloadAdapter>(['save', 'saveText']);

    const mockResponse = {
      pageItems: [
        {
          id: 1,
          resourceId: 10,
          entityName: 'Client',
          actionName: 'CREATE',
          maker: 'mifos',
          madeOnDate: '2026-06-16T12:00:00Z',
          checker: 'mifos',
          checkedOnDate: '2026-06-16T12:05:00Z',
          processingResult: 'success',
          commandAsJson: MOCK_PAYLOAD,
        },
      ],
      totalFilteredRecords: 1,
      totalRecords: 1,
    };
    auditsServiceSpy.getAudits.mockReturnValue(of(mockResponse) as unknown as Observable<never>);

    await TestBed.configureTestingModule({
      imports: [AuditLogsListComponent],
      providers: [
        ...provideTranslateTesting(),
        provideIonicTesting(),
        { provide: AuditsService, useValue: auditsServiceSpy },
        { provide: DialogService, useValue: dialogSpy },
        { provide: DOWNLOAD, useValue: downloadSpy },
        provideNoopAnimations(),
      ],
    })
      .overrideComponent(AuditLogsListComponent, {
        add: {
          providers: [{ provide: DialogService, useValue: dialogSpy }],
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(AuditLogsListComponent);
    component = fixture.componentInstance;
  });

  it('should create and load audit logs on init', () => {
    fixture.detectChanges();

    expect(component).toBeTruthy();
    expect(auditsServiceSpy.getAudits).toHaveBeenCalled();
    expect(component.auditLogs()).toHaveLength(1);
    expect(component.auditLogs()[0]['entityName']).toBe('Client');
  });

  it('should handle apply and reset filters', () => {
    fixture.detectChanges();

    component.activeFilters.actionName = 'CREATE';
    component.onApplyFilters();
    expect(component.pageIndex()).toBe(0);

    component.onResetFilters();
    expect(component.activeFilters.actionName).toBe('');
  });

  it('should handle pagination changes', () => {
    fixture.detectChanges();

    const pageEvent: PageEvent = { pageIndex: 2, pageSize: 20, length: 100 } as PageEvent;
    component.onPage(pageEvent);

    expect(component.pageIndex()).toBe(2);
    expect(component.pageSize()).toBe(20);
  });

  it('should handle sorting changes', () => {
    fixture.detectChanges();

    const sortEvent: SortEvent = { active: 'entityName', direction: 'asc' };
    component.onSort(sortEvent);

    expect(component.pageIndex()).toBe(0);
  });

  it('should open details dialog', async () => {
    fixture.detectChanges();

    const mockRow = {
      id: 1,
      commandAsJson: MOCK_PAYLOAD,
    };
    dialogSpy.open.mockResolvedValue(undefined);

    await component.onViewDetails(mockRow);

    expect(dialogSpy.open).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({ data: { payload: MOCK_PAYLOAD } }),
    );
  });

  it('exports the currently-loaded rows as CSV, excluding the actions column', () => {
    fixture.detectChanges();

    component.onExportCsv();

    expect(downloadSpy.saveText).toHaveBeenCalledTimes(1);
    const [csv, filename, mimeType] = downloadSpy.saveText.mock.lastCall!;
    expect(filename).toBe('audit-logs.csv');
    expect(mimeType).toBe('text/csv');
    expect(csv).toContain('Client');
    expect(csv).toContain('CREATE');
    expect(csv).not.toContain('COMMON.ACTIONS');
  });
});
