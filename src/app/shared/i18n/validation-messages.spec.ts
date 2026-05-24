import { describe, expect, it } from 'vitest';

import { messageFor, VALIDATION_MESSAGES } from './validation-messages';

describe('validation-messages — VALIDATION_MESSAGES dictionary', () => {
  it('required key exists', () => {
    expect(VALIDATION_MESSAGES.required).toBeDefined();
    expect(VALIDATION_MESSAGES.required).toContain('requerido');
  });

  it('email key exists', () => {
    expect(VALIDATION_MESSAGES.email).toBeDefined();
    expect(typeof VALIDATION_MESSAGES.email).toBe('string');
  });

  it('integer key exists', () => {
    expect(VALIDATION_MESSAGES.integer).toBeDefined();
    expect(typeof VALIDATION_MESSAGES.integer).toBe('string');
  });
});

describe('validation-messages — messageFor helper', () => {
  it('required returns "Este campo es requerido"', () => {
    expect(messageFor('required', true)).toBe('Este campo es requerido');
  });

  it('minlength with requiredLength=3 returns "Mínimo 3 caracteres"', () => {
    expect(messageFor('minlength', { requiredLength: 3, actualLength: 2 })).toBe(
      'Mínimo 3 caracteres',
    );
  });

  it('minlength with requiredLength=8 returns "Mínimo 8 caracteres"', () => {
    expect(messageFor('minlength', { requiredLength: 8, actualLength: 5 })).toBe(
      'Mínimo 8 caracteres',
    );
  });

  it('maxlength with requiredLength=50 returns "Máximo 50 caracteres"', () => {
    expect(messageFor('maxlength', { requiredLength: 50, actualLength: 55 })).toBe(
      'Máximo 50 caracteres',
    );
  });

  it('maxlength with requiredLength=255 returns "Máximo 255 caracteres"', () => {
    expect(messageFor('maxlength', { requiredLength: 255, actualLength: 260 })).toBe(
      'Máximo 255 caracteres',
    );
  });

  it('email returns invalid email format message', () => {
    const msg = messageFor('email', true);
    expect(msg).toContain('correo');
  });

  it('min with min=0 returns "El valor mínimo es 0"', () => {
    expect(messageFor('min', { min: 0, actual: -1 })).toBe('El valor mínimo es 0');
  });

  it('max with max=100 returns "El valor máximo es 100"', () => {
    expect(messageFor('max', { max: 100, actual: 110 })).toBe('El valor máximo es 100');
  });

  it('pattern returns format error message', () => {
    const msg = messageFor('pattern', { requiredPattern: '^[0-9]+$', actualValue: 'abc' });
    expect(msg).toContain('formato');
  });

  it('integer returns integer error message', () => {
    const msg = messageFor('integer', true);
    expect(msg).toContain('entero');
  });

  it('unknown key returns a non-empty fallback string', () => {
    const msg = messageFor('unknownKey', null);
    expect(typeof msg).toBe('string');
    expect(msg.length).toBeGreaterThan(0);
  });

  it('server key returns verbatim message string', () => {
    const msg = messageFor('server', 'El usuario ya existe');
    expect(msg).toBe('El usuario ya existe');
  });

  it('server key with non-string value returns fallback', () => {
    const msg = messageFor('server', null);
    expect(typeof msg).toBe('string');
    expect(msg.length).toBeGreaterThan(0);
  });
});
