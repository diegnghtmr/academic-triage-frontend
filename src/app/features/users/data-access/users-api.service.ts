import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import type { UserResponse } from '@core/auth/models/auth-api.types';
import type { PagedResponse } from '@shared/models/page';

import type { ListUsersQueryParams, UpdateUserBody } from '../models/user-admin.types';

/**
 * Transporte HTTP para `/users`.
 * Acceso de lectura y escritura restringido a ADMIN por el backend.
 * La UI añade `roleGuard(['ADMIN'])` como segunda capa.
 */
@Injectable({ providedIn: 'root' })
export class UsersApiService {
  private readonly http = inject(HttpClient);

  list(q: ListUsersQueryParams = {}): Observable<PagedResponse<UserResponse>> {
    let params = new HttpParams();
    if (q.role !== undefined) {
      params = params.set('role', q.role);
    }
    if (q.active !== undefined) {
      params = params.set('active', String(q.active));
    }
    if (q.page !== undefined) {
      params = params.set('page', String(q.page));
    }
    if (q.size !== undefined) {
      params = params.set('size', String(q.size));
    }
    if (q.sort !== undefined && q.sort !== '') {
      params = params.set('sort', q.sort);
    }
    return this.http.get<PagedResponse<UserResponse>>('users', { params });
  }

  getById(userId: number): Observable<UserResponse> {
    return this.http.get<UserResponse>(`users/${userId}`);
  }

  update(userId: number, body: UpdateUserBody): Observable<UserResponse> {
    return this.http.put<UserResponse>(`users/${userId}`, body);
  }
}
