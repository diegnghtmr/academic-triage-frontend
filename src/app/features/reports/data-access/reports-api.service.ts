import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import type { DashboardMetrics, DashboardQueryParams } from '../models/dashboard-metrics.types';

/**
 * Transporte HTTP para `/reports/dashboard`.
 * Acceso restringido a ADMIN por el backend; la UI añade `roleGuard(['ADMIN'])`.
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
