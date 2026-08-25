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

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTranslateTesting } from '../../../testing/i18n-testing';

import { ViewPayloadDialogComponent } from './view-payload-dialog.component';
import { provideIonicTesting } from '../../../testing/ionic-testing';

const PAYLOAD_PROP = 'data';

describe('ViewPayloadDialogComponent', () => {
  let fixture: ComponentFixture<ViewPayloadDialogComponent>;

  async function setup(payload: string): Promise<ViewPayloadDialogComponent> {
    await TestBed.configureTestingModule({
      imports: [ViewPayloadDialogComponent],
      providers: [...provideTranslateTesting(), provideIonicTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(ViewPayloadDialogComponent);
    fixture.componentRef.setInput(PAYLOAD_PROP, { payload });
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  /**
   * The dialog used to derive its text in the constructor, where an input is not populated yet.
   * That threw, and the `catch` then threw a second time reading the same undefined input, so the
   * error escaped the constructor and the dialog never opened. Constructing it and reading the
   * rendered payload is the regression check.
   */
  it('renders the payload it was opened with', async () => {
    const component = await setup('{"loanId":7}');

    expect(component).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.payload-code').textContent).toContain('loanId');
  });

  it('pretty-prints a JSON payload', async () => {
    const component = await setup('{"loanId":7,"principal":1000}');

    expect(component.formattedJson()).toBe(
      ['{', '  "loanId": 7,', '  "principal": 1000', '}'].join('\n'),
    );
  });

  it('falls back to the raw text when the payload is not JSON', async () => {
    const component = await setup('not json at all');

    expect(component.formattedJson()).toBe('not json at all');
  });
});
