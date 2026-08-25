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
import { BulkImportComponent } from './bulk-import.component';
import {
  BulkImportService,
  CentersService,
  ClientService,
  FixedDepositAccountService,
  GeneralLedgerAccountService,
  GroupsService,
  GuarantorsService,
  JournalEntriesService,
  LoansService,
  OfficesService,
  RecurringDepositAccountService,
  SavingsAccountService,
  ShareAccountService,
  StaffService,
  UsersService,
} from '../../../api';
import { of } from 'rxjs';
import { provideTranslateTesting } from '../../../testing/i18n-testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

describe('BulkImportComponent', () => {
  let component: BulkImportComponent;
  let fixture: ComponentFixture<BulkImportComponent>;
  let bulkImportServiceSpy: SpyObj<BulkImportService>;
  let glAccountServiceSpy: SpyObj<GeneralLedgerAccountService>;
  let journalEntriesServiceSpy: SpyObj<JournalEntriesService>;
  let guarantorsServiceSpy: SpyObj<GuarantorsService>;
  let officesServiceSpy: SpyObj<OfficesService>;

  beforeEach(async () => {
    bulkImportServiceSpy = createSpyObj(['getImports', 'getImportsDownloadOutputTemplate']);
    bulkImportServiceSpy.getImports.mockReturnValue(
      of([]) as unknown as ReturnType<BulkImportService['getImports']>,
    );

    glAccountServiceSpy = createSpyObj([
      'getGlaccountsDownloadtemplate',
      'postGlaccountsUploadtemplate',
    ]);
    journalEntriesServiceSpy = createSpyObj([
      'getJournalentriesDownloadtemplate',
      'postJournalentriesUploadtemplate',
    ]);
    guarantorsServiceSpy = createSpyObj([
      'getLoansLoanIdGuarantorsDownloadtemplate',
      'postLoansLoanIdGuarantorsUploadtemplate',
    ]);
    officesServiceSpy = createSpyObj(['getOfficesDownloadtemplate', 'postOfficesUploadtemplate']);

    await TestBed.configureTestingModule({
      imports: [BulkImportComponent],
      providers: [
        ...provideTranslateTesting(),
        { provide: BulkImportService, useValue: bulkImportServiceSpy },
        { provide: ClientService, useValue: {} },
        { provide: LoansService, useValue: {} },
        { provide: SavingsAccountService, useValue: {} },
        { provide: JournalEntriesService, useValue: journalEntriesServiceSpy },
        { provide: GeneralLedgerAccountService, useValue: glAccountServiceSpy },
        { provide: OfficesService, useValue: officesServiceSpy },
        { provide: UsersService, useValue: {} },
        { provide: GroupsService, useValue: {} },
        { provide: CentersService, useValue: {} },
        { provide: StaffService, useValue: {} },
        { provide: FixedDepositAccountService, useValue: {} },
        { provide: RecurringDepositAccountService, useValue: {} },
        { provide: ShareAccountService, useValue: {} },
        { provide: GuarantorsService, useValue: guarantorsServiceSpy },
        provideNoopAnimations(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BulkImportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and load import history on init', () => {
    expect(component).toBeTruthy();
    expect(bulkImportServiceSpy.getImports).toHaveBeenCalled();
  });

  it('should download a result by coercing the id to a number', () => {
    vi.spyOn(window.URL, 'createObjectURL').mockReturnValue('blob:fake');
    vi.spyOn(window.URL, 'revokeObjectURL');
    bulkImportServiceSpy.getImportsDownloadOutputTemplate.mockReturnValue(
      of(new Blob()) as unknown as ReturnType<
        BulkImportService['getImportsDownloadOutputTemplate']
      >,
    );

    component.onDownloadResult('42');

    expect(bulkImportServiceSpy.getImportsDownloadOutputTemplate).toHaveBeenCalledWith(42);
  });

  it('offers every entity web-app supports, not just the original four', () => {
    const values = component.entityTypes.map((entity) => entity.value);
    expect(values).toEqual(
      expect.arrayContaining([
        'clients',
        'loans',
        'savingsaccounts',
        'glaccounts',
        'journalentries',
        'offices',
        'users',
        'groups',
        'centers',
        'staff',
        'fixeddepositaccounts',
        'recurringdepositaccounts',
        'shareaccounts',
        'loanrepayments',
        'savingstransactions',
        'fixeddeposittransactions',
        'recurringdeposittransactions',
        'guarantors',
      ]),
    );
  });

  /**
   * "Chart of Accounts" used to call the journal-entries template by mistake — every other
   * entity here names its own resource, so this was a copy-pasted service, not a deliberate
   * shared endpoint. "Journal Entries" is now its own, separate entity for that endpoint.
   */
  it('downloads the chart-of-accounts template from its own endpoint, not the journal-entries one', () => {
    glAccountServiceSpy.getGlaccountsDownloadtemplate.mockReturnValue(
      of(new Blob()) as unknown as ReturnType<
        GeneralLedgerAccountService['getGlaccountsDownloadtemplate']
      >,
    );
    component.selectedEntity = 'glaccounts';

    component.onDownloadTemplate();

    expect(glAccountServiceSpy.getGlaccountsDownloadtemplate).toHaveBeenCalled();
    expect(journalEntriesServiceSpy.getJournalentriesDownloadtemplate).not.toHaveBeenCalled();
  });

  it('downloads the journal-entries template as its own distinct entity', () => {
    journalEntriesServiceSpy.getJournalentriesDownloadtemplate.mockReturnValue(
      of(new Blob()) as unknown as ReturnType<
        JournalEntriesService['getJournalentriesDownloadtemplate']
      >,
    );
    component.selectedEntity = 'journalentries';

    component.onDownloadTemplate();

    expect(journalEntriesServiceSpy.getJournalentriesDownloadtemplate).toHaveBeenCalled();
  });

  it('reaches the offices template through its own service', () => {
    officesServiceSpy.getOfficesDownloadtemplate.mockReturnValue(
      of(new Blob()) as unknown as ReturnType<OfficesService['getOfficesDownloadtemplate']>,
    );
    component.selectedEntity = 'offices';

    component.onDownloadTemplate();

    expect(officesServiceSpy.getOfficesDownloadtemplate).toHaveBeenCalled();
  });

  /**
   * Guarantors are scoped to one loan — the only entity here whose template endpoint takes a
   * loan id — so the screen must not call it until that id is known.
   */
  describe('guarantors, which are scoped to one loan', () => {
    beforeEach(() => {
      component.selectedEntity = 'guarantors';
    });

    it('requires a loan id before either action is available', () => {
      expect(component.requiresLoanId()).toBe(true);
    });

    it('does not call the template endpoint without a loan id', () => {
      component.guarantorLoanId = null;

      component.onDownloadTemplate();

      expect(guarantorsServiceSpy.getLoansLoanIdGuarantorsDownloadtemplate).not.toHaveBeenCalled();
    });

    it('calls the template endpoint with the entered loan id', () => {
      guarantorsServiceSpy.getLoansLoanIdGuarantorsDownloadtemplate.mockReturnValue(
        of(new Blob()) as unknown as ReturnType<
          GuarantorsService['getLoansLoanIdGuarantorsDownloadtemplate']
        >,
      );
      component.guarantorLoanId = 7;

      component.onDownloadTemplate();

      expect(guarantorsServiceSpy.getLoansLoanIdGuarantorsDownloadtemplate).toHaveBeenCalledWith(
        7,
        undefined,
        expect.any(String),
      );
    });

    it('clears the loan id when switching away to another entity', () => {
      component.guarantorLoanId = 7;

      component.onEntityChange();

      expect(component.guarantorLoanId).toBeNull();
    });
  });
});
