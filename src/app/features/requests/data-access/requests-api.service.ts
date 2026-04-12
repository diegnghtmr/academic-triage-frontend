import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import type {
  AddHistoryNoteBody,
  AssignRequestBody,
  AttendRequestBody,
  CancelRequestBody,
  ClassifyRequestBody,
  CloseRequestBody,
  CreateRequestBody,
  HistoryEntryResponse,
  ListRequestsQueryParams,
  PagedRequestResponse,
  PrioritizeRequestBody,
  PrioritySuggestionResponse,
  RejectRequestBody,
  RequestDetailResponse,
  RequestResponse,
} from '../models/request-api.types';

/**
 * API de solicitudes académicas — transporte HTTP alineado al OpenAPI.
 */
@Injectable({ providedIn: 'root' })
export class RequestsApiService {
  private readonly http = inject(HttpClient);

  listRequests(q: ListRequestsQueryParams = {}): Observable<PagedRequestResponse> {
    let params = new HttpParams();
    const set = (key: string, value: string | number | undefined) => {
      if (value !== undefined && value !== '') {
        params = params.set(key, String(value));
      }
    };
    set('status', q.status);
    set('requestTypeId', q.requestTypeId);
    set('priority', q.priority);
    set('assignedToUserId', q.assignedToUserId);
    set('requesterUserId', q.requesterUserId);
    set('dateFrom', q.dateFrom);
    set('dateTo', q.dateTo);
    set('page', q.page);
    set('size', q.size);
    set('sort', q.sort);
    return this.http.get<PagedRequestResponse>('requests', { params });
  }

  createRequest(body: CreateRequestBody): Observable<RequestResponse> {
    return this.http.post<RequestResponse>('requests', body);
  }

  getRequestById(requestId: number): Observable<RequestDetailResponse> {
    return this.http.get<RequestDetailResponse>(`requests/${requestId}`);
  }

  getRequestHistory(requestId: number): Observable<HistoryEntryResponse[]> {
    return this.http.get<HistoryEntryResponse[]>(
      `requests/${requestId}/history`,
    );
  }

  addHistoryNote(
    requestId: number,
    body: AddHistoryNoteBody,
  ): Observable<HistoryEntryResponse> {
    return this.http.post<HistoryEntryResponse>(
      `requests/${requestId}/history`,
      body,
    );
  }

  getPrioritySuggestion(
    requestId: number,
  ): Observable<PrioritySuggestionResponse> {
    return this.http.get<PrioritySuggestionResponse>(
      `requests/${requestId}/priority-suggestion`,
    );
  }

  classifyRequest(
    requestId: number,
    body: ClassifyRequestBody,
  ): Observable<RequestResponse> {
    return this.http.patch<RequestResponse>(
      `requests/${requestId}/classify`,
      body,
    );
  }

  prioritizeRequest(
    requestId: number,
    body: PrioritizeRequestBody,
  ): Observable<RequestResponse> {
    return this.http.patch<RequestResponse>(
      `requests/${requestId}/prioritize`,
      body,
    );
  }

  assignRequest(
    requestId: number,
    body: AssignRequestBody,
  ): Observable<RequestResponse> {
    return this.http.patch<RequestResponse>(
      `requests/${requestId}/assign`,
      body,
    );
  }

  attendRequest(
    requestId: number,
    body: AttendRequestBody,
  ): Observable<RequestResponse> {
    return this.http.patch<RequestResponse>(
      `requests/${requestId}/attend`,
      body,
    );
  }

  closeRequest(
    requestId: number,
    body: CloseRequestBody,
  ): Observable<RequestResponse> {
    return this.http.patch<RequestResponse>(
      `requests/${requestId}/close`,
      body,
    );
  }

  cancelRequest(
    requestId: number,
    body: CancelRequestBody,
  ): Observable<RequestResponse> {
    return this.http.patch<RequestResponse>(
      `requests/${requestId}/cancel`,
      body,
    );
  }

  rejectRequest(
    requestId: number,
    body: RejectRequestBody,
  ): Observable<RequestResponse> {
    return this.http.patch<RequestResponse>(
      `requests/${requestId}/reject`,
      body,
    );
  }
}
