import type { HttpErrorResponse } from '@angular/common/http';
import { describe, expect, it } from 'vitest';

import { ProblemErrorMapper } from './problem-error.mapper';

describe('ProblemErrorMapper', () => {
  const mapper = new ProblemErrorMapper();

  it('normalizes application/problem+json payloads with fieldErrors', () => {
    const normalized = mapper.normalize({
      title: 'Validation error',
      status: 400,
      detail: 'Invalid payload',
      fieldErrors: [
        { field: 'username', message: 'required' },
        { field: 'password', message: 'too short' },
        { field: 'ignored' },
      ],
    });

    expect(normalized.title).toBe('Validation error');
    expect(normalized.status).toBe(400);
    expect(normalized.detail).toBe('Invalid payload');
    expect(normalized.fieldErrors).toEqual([
      { field: 'username', message: 'required' },
      { field: 'password', message: 'too short' },
    ]);
  });

  it('falls back to generic values for non-problem payloads', () => {
    const error = {
      status: 500,
      statusText: 'Server Error',
      error: 'Unexpected failure',
      message: 'Http failure response',
    } as HttpErrorResponse;

    const mapped = mapper.fromHttpError(error);
    expect(mapped).toEqual({
      status: 500,
      title: 'Server Error',
      detail: 'Unexpected failure',
    });
  });
});
