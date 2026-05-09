import { HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';

import type { ProblemDetail, ProblemDetailFieldError } from './problem-detail';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function pickString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function pickNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function normalizeFieldErrors(value: unknown): ProblemDetailFieldError[] | null | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const out: ProblemDetailFieldError[] = [];
  for (const item of value) {
    if (!isRecord(item)) {
      continue;
    }
    const field = pickString(item['field']);
    const message = pickString(item['message']);
    if (field !== undefined && message !== undefined) {
      out.push({ field, message });
    }
  }
  return out.length > 0 ? out : null;
}

/**
 * Converts `application/problem+json` bodies (and generic HTTP errors) to {@link ProblemDetail}.
 * The UI must consume this type, not the raw payload.
 */
@Injectable({ providedIn: 'root' })
export class ProblemErrorMapper {
  fromHttpError(error: HttpErrorResponse): ProblemDetail | null {
    const body = error.error;
    if (isRecord(body) && (body['title'] !== undefined || body['detail'] !== undefined)) {
      return this.normalize(body);
    }
    return {
      status: error.status,
      title: error.statusText || 'Error',
      detail: typeof body === 'string' ? body : error.message,
    };
  }

  normalize(body: Record<string, unknown>): ProblemDetail {
    return {
      type: body['type'] === null ? null : pickString(body['type']) ?? null,
      title: pickString(body['title']),
      status: pickNumber(body['status']),
      detail: body['detail'] === null ? null : pickString(body['detail']) ?? null,
      instance: body['instance'] === null ? null : pickString(body['instance']) ?? null,
      fieldErrors: normalizeFieldErrors(body['fieldErrors']),
    };
  }
}
