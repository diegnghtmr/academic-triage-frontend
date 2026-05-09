import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import {
  PreloadAllModules,
  provideRouter,
  withPreloading,
  withViewTransitions,
} from '@angular/router';

import { API_BASE_URL } from '@core/http/api-base-url.token';
import { authInterceptor } from '@core/http/auth.interceptor';
import { apiBaseUrlInterceptor } from '@core/http/api-base-url.interceptor';
import { httpErrorInterceptor } from '@core/http/http-error.interceptor';
import { getApiBaseUrl } from '@core/config/env';

import { routes } from './routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(
      routes,
      withPreloading(PreloadAllModules),
      withViewTransitions({ skipInitialTransition: true }),
    ),
    { provide: API_BASE_URL, useValue: getApiBaseUrl() },
    provideHttpClient(withInterceptors([apiBaseUrlInterceptor, authInterceptor, httpErrorInterceptor])),
  ],
};
