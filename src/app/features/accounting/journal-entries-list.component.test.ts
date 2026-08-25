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

import { createSpyObj, SpyObj } from '../../testing/mocks';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { JournalEntriesListComponent } from './journal-entries-list.component';
import {
  GeneralLedgerAccountService,
  GetJournalEntriesTransactionIdResponse,
  JournalEntriesService,
  OfficesService,
} from '../../api';
import { Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { provideTranslateTesting } from '../../testing/i18n-testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { HttpEvent } from '@angular/common/http';

describe('JournalEntriesListComponent', () => {
  let component: JournalEntriesListComponent;
  let fixture: ComponentFixture<JournalEntriesListComponent>;
  let journalEntriesServiceSpy: SpyObj<JournalEntriesService>;
  let officesServiceSpy: SpyObj<OfficesService>;
  let glAccountServiceSpy: SpyObj<GeneralLedgerAccountService>;
  let routerSpy: SpyObj<Router>;

  beforeEach(async () => {
    journalEntriesServiceSpy = createSpyObj(['getJournalentries']);
    officesServiceSpy = createSpyObj(['getOffices']);
    glAccountServiceSpy = createSpyObj(['getGlaccounts']);
    routerSpy = createSpyObj(['navigate']);

    officesServiceSpy.getOffices.mockReturnValue(
      of([{ id: 1, name: 'Head Office' }]) as unknown as Observable<never>,
    );
    glAccountServiceSpy.getGlaccounts.mockReturnValue(
      of([{ id: 2, name: 'Cash' }]) as unknown as Observable<never>,
    );

    await TestBed.configureTestingModule({
      imports: [JournalEntriesListComponent],
      providers: [
        ...provideTranslateTesting(),
        { provide: JournalEntriesService, useValue: journalEntriesServiceSpy },
        { provide: OfficesService, useValue: officesServiceSpy },
        { provide: GeneralLedgerAccountService, useValue: glAccountServiceSpy },
        { provide: Router, useValue: routerSpy },
        provideNoopAnimations(),
      ],
    }).compileComponents();

    journalEntriesServiceSpy.getJournalentries.mockReturnValue(
      of({ pageItems: [], totalFilteredRecords: 0 }) as unknown as Observable<
        HttpEvent<GetJournalEntriesTransactionIdResponse>
      >,
    );
    fixture = TestBed.createComponent(JournalEntriesListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load journal entries on init', () => {
    expect(journalEntriesServiceSpy.getJournalentries).toHaveBeenCalled();
  });

  it('loads offices and GL accounts to populate the filter panel', () => {
    expect(officesServiceSpy.getOffices).toHaveBeenCalled();
    expect(glAccountServiceSpy.getGlaccounts).toHaveBeenCalled();
    expect(component.offices()).toEqual([{ id: 1, name: 'Head Office' }] as never);
    expect(component.glAccounts()).toEqual([{ id: 2, name: 'Cash' }] as never);
  });

  it('should navigate to create on onCreateEntry', () => {
    component.onCreateEntry();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/accounting/journal-entries/create']);
  });

  /**
   * `officeId`/`glAccountId`/`manualEntriesOnly`/`fromDate`/`toDate` sit right after
   * `transactionId` in `getJournalentries`'s positional signature, so a filter sent in the wrong
   * slot still compiles — only a call-arguments assertion catches that.
   */
  describe('filters', () => {
    it('sends the selected office, GL account and manual-entries flag', () => {
      component.activeFilters.officeId = 1;
      component.activeFilters.glAccountId = 2;
      component.activeFilters.manualEntriesOnly = 'true';

      component.onApplyFilters();

      const args = journalEntriesServiceSpy.getJournalentries.mock.lastCall!;
      expect(args[0]).toBe(1);
      expect(args[1]).toBe(2);
      expect(args[2]).toBe(true);
    });

    it('formats the date range the way Fineract documents for this endpoint', () => {
      component.activeFilters.fromDate = new Date(2026, 0, 1);
      component.activeFilters.toDate = new Date(2026, 0, 31);

      component.onApplyFilters();

      const args = journalEntriesServiceSpy.getJournalentries.mock.lastCall!;
      expect(args[3] as unknown as string).toBe('01 January 2026');
      expect(args[4] as unknown as string).toBe('31 January 2026');
    });

    it('resets every filter and reruns the query', () => {
      component.activeFilters.officeId = 1;
      component.activeFilters.manualEntriesOnly = 'true';

      component.onResetFilters();

      expect(component.activeFilters.officeId).toBeUndefined();
      expect(component.activeFilters.manualEntriesOnly).toBe('');
      const args = journalEntriesServiceSpy.getJournalentries.mock.lastCall!;
      expect(args[0]).toBeUndefined();
      expect(args[2]).toBeUndefined();
    });
  });
});
