import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import type {
  AiClassificationRequest,
  AiClassificationResponse,
  AiSummaryResponse,
} from '../models/ai-api.types';

/**
 * HTTP transport for the `/ai/*` endpoints.
 *
 * The backend returns `503 Service Unavailable` when the AI service is not
 * enabled. Consumers must treat this status code as an expected functional
 * state and NOT as an application crash.
 */
@Injectable({ providedIn: 'root' })
export class AiApiService {
  private readonly http = inject(HttpClient);

  /**
   * `POST /ai/suggest-classification`
   * Sends the descriptive text and receives a suggested type and priority.
   */
  suggestClassification(body: AiClassificationRequest): Observable<AiClassificationResponse> {
    return this.http.post<AiClassificationResponse>('ai/suggest-classification', body);
  }

  /**
   * `GET /ai/summarize/{requestId}`
   * Generates a textual summary of the request's status and history.
   */
  summarizeRequest(requestId: number): Observable<AiSummaryResponse> {
    return this.http.get<AiSummaryResponse>(`ai/summarize/${requestId}`);
  }
}
