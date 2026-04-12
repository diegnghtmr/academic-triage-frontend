import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';

import { API_BASE_URL } from '@core/http/api-base-url.token';
import { authInterceptor } from '@core/http/auth.interceptor';
import { apiBaseUrlInterceptor } from '@core/http/api-base-url.interceptor';
import { getApiBaseUrl } from '@core/config/env';

import { routes } from './routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    { provide: API_BASE_URL, useValue: getApiBaseUrl() },
    provideHttpClient(withInterceptors([apiBaseUrlInterceptor, authInterceptor])),
  ],
};
