import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import type { DashboardMetrics, DashboardQueryParams } from './dashboard-metrics.types';

/**
 * HTTP transport for `/reports/dashboard`.
 * Access is restricted to ADMIN by the backend; the UI adds `roleGuard(['ADMIN'])`.
 */
@Injectable({ providedIn: 'root' })
export class ReportsApiService {
  private readonly http = inject(HttpClient);

  getDashboard(q: DashboardQueryParams = {}): Observable<DashboardMetrics> {
    let params = new HttpParams();
    if (q.dateFrom !== undefined && q.dateFrom !== '') {
      params = params.set('dateFrom', q.dateFrom);
    }
    if (q.dateTo !== undefined && q.dateTo !== '') {
      params = params.set('dateTo', q.dateTo);
    }
    return this.http.get<DashboardMetrics>('reports/dashboard', { params });
  }
}
