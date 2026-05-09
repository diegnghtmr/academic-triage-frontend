import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import type {
  OriginChannelResponse,
  RequestTypeResponse,
} from '../models/request-api.types';

/**
 * Catalog reads for forms (`GET /catalogs/*`).
 * Without `active` in the query: the backend applies the documented default (active items only).
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
