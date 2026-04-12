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
 * Cliente HTTP de autenticación contra el backend oficial (`/auth/*`).
 * Sin lógica de sesión: solo transporte.
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
