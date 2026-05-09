import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import type {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  UserResponse,
} from '@core/auth/models/auth-api.types';

/**
 * HTTP client for authentication against the official backend (`/auth/*`).
 * No session logic: transport only.
 */
@Injectable({ providedIn: 'root' })
export class AuthApiService {
  private readonly http = inject(HttpClient);

  login(body: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>('auth/login', body);
  }

  register(body: RegisterRequest): Observable<UserResponse> {
    return this.http.post<UserResponse>('auth/register', body);
  }
}
