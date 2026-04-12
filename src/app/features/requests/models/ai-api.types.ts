/**
 * DTOs de los endpoints `/ai/*` — alineados a `docs/openapi-academic-triage.yaml`.
 *
 * Ambos endpoints retornan `503 Service Unavailable` cuando el servicio de IA
 * está deshabilitado en el backend. La UI trata el 503 como estado funcional esperado,
 * NO como error de la aplicación.
 */

import type { PriorityEnum } from './request-api.types';

/** Body de `POST /ai/suggest-classification`. */
export interface AiClassificationRequest {
  /** Texto descriptivo de la solicitud. minLength: 10, maxLength: 2000. */
  description: string;
}

/** Respuesta de `POST /ai/suggest-classification`. */
export interface AiClassificationResponse {
  /** Nombre del tipo de solicitud sugerido por la IA. */
  suggestedRequestType?: string;
  /** ID del tipo sugerido si existe en el catálogo; null si no hay match. */
  suggestedRequestTypeId?: number | null;
  /** Prioridad sugerida. */
  suggestedPriority?: PriorityEnum;
  /** Nivel de confianza entre 0.0 y 1.0. */
  confidence?: number;
  /** Razonamiento textual del modelo. */
  reasoning?: string;
}

/** Respuesta de `GET /ai/summarize/{requestId}`. */
export interface AiSummaryResponse {
  requestId?: number;
  /** Resumen textual del estado e historial generado por el LLM. */
  summary?: string;
  /** Fecha/hora de generación (ISO 8601). */
  generatedAt?: string;
}
