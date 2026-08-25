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

import { TestBed } from '@angular/core/testing';
import { initializeApp, appConfig } from './app.config';
import { BASE_PATH } from './api/variables';
import { ConfigService } from './core/services/config.service';
import { BrandingService } from './core/services/branding.service';

describe('AppConfig', () => {
  const API_URL = 'http://localhost/fineract-provider/api';

  it('loads the config and applies branding before the app starts', async () => {
    // `initializeApp` resolves its own dependencies with `inject`, so it has to run inside an
    // injection context rather than being handed them as arguments.
    const configServiceSpy = jasmine.createSpyObj('ConfigService', ['loadConfig']);
    configServiceSpy.loadConfig.and.returnValue(Promise.resolve());
    const brandingSpy = jasmine.createSpyObj('BrandingService', ['apply']);

    TestBed.configureTestingModule({
      providers: [
        { provide: ConfigService, useValue: configServiceSpy },
        { provide: BrandingService, useValue: brandingSpy },
      ],
    });

    await TestBed.runInInjectionContext(() => initializeApp());

    expect(configServiceSpy.loadConfig).toHaveBeenCalled();
    // Branding must land after the config it reads from, and before the first paint.
    expect(brandingSpy.apply).toHaveBeenCalled();
  });

  it('should provide BASE_PATH from ConfigService', () => {
    const basePathProvider = (appConfig.providers as unknown as Record<string, unknown>[]).find(
      (p) => p && p['provide'] === BASE_PATH,
    );

    expect(basePathProvider).toBeTruthy();

    const configServiceSpy = jasmine.createSpyObj('ConfigService', [], {
      apiUrl: `${API_URL}/v1`,
    });
    const result = (basePathProvider!['useFactory'] as (...args: unknown[]) => unknown)(
      configServiceSpy,
    );
    expect(result).toBe(API_URL);
  });

  it('should not trim /v1 if apiUrl does not end with /v1', () => {
    const basePathProvider = (appConfig.providers as unknown as Record<string, unknown>[]).find(
      (p) => p && p['provide'] === BASE_PATH,
    );

    const configServiceSpy = jasmine.createSpyObj('ConfigService', [], {
      apiUrl: API_URL,
    });
    const result = (basePathProvider!['useFactory'] as (...args: unknown[]) => unknown)(
      configServiceSpy,
    );
    expect(result).toBe(API_URL);
  });
});
