import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import type {
  AiClassificationRequest,
  AiClassificationResponse,
  AiSummaryResponse,
} from '../models/ai-api.types';

/**
 * Transporte HTTP para los endpoints `/ai/*`.
 *
 * El backend retorna `503 Service Unavailable` cuando el servicio de IA no está
 * habilitado. Los componentes consumidores deben tratar este código como caso
 * funcional esperado y NO como crash de la aplicación.
 */
@Injectable({ providedIn: 'root' })
export class AiApiService {
  private readonly http = inject(HttpClient);

  /**
   * `POST /ai/suggest-classification`
   * Envía el texto descriptivo y recibe una sugerencia de tipo y prioridad.
   */
  suggestClassification(
    body: AiClassificationRequest,
  ): Observable<AiClassificationResponse> {
    return this.http.post<AiClassificationResponse>(
      'ai/suggest-classification',
      body,
    );
  }

  /**
   * `GET /ai/summarize/{requestId}`
   * Genera un resumen textual del estado e historial de la solicitud.
   */
  summarizeRequest(requestId: number): Observable<AiSummaryResponse> {
    return this.http.get<AiSummaryResponse>(`ai/summarize/${requestId}`);
  }
}
