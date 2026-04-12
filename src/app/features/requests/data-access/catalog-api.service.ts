import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import type {
  OriginChannelResponse,
  RequestTypeResponse,
} from '../models/request-api.types';

/**
 * Lectura de catálogos para formularios (`GET /catalogs/*`).
 * Sin `active` en la query: el backend aplica el default documentado (solo activos).
 */
@Injectable({ providedIn: 'root' })
export class CatalogApiService {
  private readonly http = inject(HttpClient);

  listRequestTypes(active?: boolean): Observable<RequestTypeResponse[]> {
    return this.http.get<RequestTypeResponse[]>('catalogs/request-types', {
      ...(active !== undefined
        ? { params: new HttpParams().set('active', String(active)) }
        : {}),
    });
  }

  listOriginChannels(active?: boolean): Observable<OriginChannelResponse[]> {
    return this.http.get<OriginChannelResponse[]>('catalogs/origin-channels', {
      ...(active !== undefined
        ? { params: new HttpParams().set('active', String(active)) }
        : {}),
    });
  }
}
