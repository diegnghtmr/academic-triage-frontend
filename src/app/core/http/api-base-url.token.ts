import { InjectionToken } from '@angular/core';

/** Base URL del API oficial (incluye `/api/v1`). */
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL');
