import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import type {
  CreateOriginChannelBody,
  CreateRequestTypeBody,
  OriginChannelResponse,
  RequestTypeResponse,
} from '../models/catalog-admin.types';

/**
 * ADMIN operations on catalogues: full read (active + inactive),
 * create, and edit. Aligned to `/catalogs/*` of the official OpenAPI spec.
 * Must only be injected in components with the ADMIN role.
 */
@Injectable({ providedIn: 'root' })
export class CatalogAdminApiService {
  private readonly http = inject(HttpClient);

  // ── Request Types ──────────────────────────────────────────────────────────

  listRequestTypes(active?: boolean): Observable<RequestTypeResponse[]> {
    const params =
      active !== undefined ? new HttpParams().set('active', String(active)) : undefined;
    return this.http.get<RequestTypeResponse[]>('catalogs/request-types', {
      params,
    });
  }

  getRequestTypeById(typeId: number): Observable<RequestTypeResponse> {
    return this.http.get<RequestTypeResponse>(`catalogs/request-types/${typeId}`);
  }

  createRequestType(body: CreateRequestTypeBody): Observable<RequestTypeResponse> {
    return this.http.post<RequestTypeResponse>('catalogs/request-types', body);
  }

  updateRequestType(typeId: number, body: CreateRequestTypeBody): Observable<RequestTypeResponse> {
    return this.http.put<RequestTypeResponse>(`catalogs/request-types/${typeId}`, body);
  }

  // ── Origin Channels ────────────────────────────────────────────────────────

  listOriginChannels(active?: boolean): Observable<OriginChannelResponse[]> {
    const params =
      active !== undefined ? new HttpParams().set('active', String(active)) : undefined;
    return this.http.get<OriginChannelResponse[]>('catalogs/origin-channels', {
      params,
    });
  }

  getOriginChannelById(channelId: number): Observable<OriginChannelResponse> {
    return this.http.get<OriginChannelResponse>(`catalogs/origin-channels/${channelId}`);
  }

  createOriginChannel(body: CreateOriginChannelBody): Observable<OriginChannelResponse> {
    return this.http.post<OriginChannelResponse>('catalogs/origin-channels', body);
  }

  updateOriginChannel(
    channelId: number,
    body: CreateOriginChannelBody,
  ): Observable<OriginChannelResponse> {
    return this.http.put<OriginChannelResponse>(`catalogs/origin-channels/${channelId}`, body);
  }
}
