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
import { provideTranslateTesting } from '../../testing/i18n-testing';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { UserProfileComponent } from './user-profile.component';
import { UsersService } from '../../api';
import { AuthService } from '../../core/services/auth.service';
import { provideIonicTesting } from '../../testing/ionic-testing';

const USER = {
  id: 7,
  username: 'mifos',
  firstname: 'App',
  lastname: 'Administrator',
  email: 'demomfi@mifos.org',
  officeId: 1,
  officeName: 'Head Office',
  selectedRoles: [{ id: 1, name: 'Super user' }],
};

describe('UserProfileComponent', () => {
  let fixture: ComponentFixture<UserProfileComponent>;
  let component: UserProfileComponent;
  let usersSpy: SpyObj<UsersService>;

  const setup = async (currentUser: { userId: number } | null) => {
    usersSpy = createSpyObj<UsersService>(['getUsersUserId']);
    await TestBed.configureTestingModule({
      imports: [UserProfileComponent],
      providers: [
        ...provideTranslateTesting(),
        provideIonicTesting(),
        { provide: UsersService, useValue: usersSpy },
        { provide: AuthService, useValue: { currentUser: signal(currentUser) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(UserProfileComponent);
    component = fixture.componentInstance;
  };

  it('reads the profile from /users/{id} using the session user id', async () => {
    await setup({ userId: 7 });
    usersSpy.getUsersUserId.mockReturnValue(of(USER) as never);

    fixture.detectChanges();

    expect(usersSpy.getUsersUserId).toHaveBeenCalledWith(7);
    expect(component.username).toBe('mifos');
    expect(component.displayName).toBe('App Administrator');
    expect(component.email).toBe('demomfi@mifos.org');
    expect(component.officeName).toBe('Head Office');
    expect(component.roles).toHaveLength(1);
    expect(component.isLoading()).toBe(false);
    expect(component.loadError()).toBe(false);
  });

  /*
   * The reported bug: the request 404s and the page sits on a spinner forever.
   * isLoading was a plain field, so clearing it from the error callback never
   * marked the view dirty. These assert the flags settle and the template
   * actually swaps the spinner for an error.
   */
  it('surfaces an error instead of spinning when the request fails', async () => {
    await setup({ userId: 7 });
    usersSpy.getUsersUserId.mockReturnValue(throwError(() => ({ status: 404 })));

    fixture.detectChanges();

    expect(component.isLoading()).toBe(false);
    expect(component.loadError()).toBe(true);

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('[data-testid="profile-load-error"]')).toBeTruthy();
    expect(el.querySelector('ion-spinner')).toBeNull();
  });

  it('does not call the API when the session has no user id', async () => {
    await setup(null);

    fixture.detectChanges();

    expect(usersSpy.getUsersUserId).not.toHaveBeenCalled();
    expect(component.isLoading()).toBe(false);
    expect(component.loadError()).toBe(true);
  });
});
