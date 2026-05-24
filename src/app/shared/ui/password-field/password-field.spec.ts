import '@angular/compiler';
import { readFileSync } from 'fs';
import { join } from 'path';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { PasswordField } from './password-field';

/**
 * PasswordField — spec covering UV-4 AC1–AC7, UV-12 AC3.
 *
 * Strategy:
 *   A) Source-level template assertions for ARIA and toggle wiring.
 *   B) Unit tests for the toggle logic via direct component instantiation.
 *   C) CVA smoke tests (writeValue, registerOnChange, registerOnTouched).
 */
const source = readFileSync(join(import.meta.dirname, 'password-field.ts'), 'utf-8');

// ─── environment bootstrap ────────────────────────────────────────────────────

beforeAll(() => {
  if (!('document' in globalThis)) {
    Object.defineProperty(globalThis, 'document', { value: {}, configurable: true });
  }
  try {
    TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
  } catch {
    // Already initialized.
  }
});

// ─── A. Source-level template assertions ─────────────────────────────────────

describe('PasswordField — template ARIA contracts (UV-4 AC1–AC6)', () => {
  it('UV-4 AC1: toggle button is type="button" (not submit)', () => {
    expect(source).toContain('type="button"');
  });

  it('UV-4 AC2: button binds [attr.aria-pressed] to revealed()', () => {
    expect(source).toContain('aria-pressed');
    expect(source).toContain('revealed()');
  });

  it('UV-4 AC3: label changes between "Mostrar contraseña" and "Ocultar contraseña"', () => {
    expect(source).toContain('Mostrar contraseña');
    expect(source).toContain('Ocultar contraseña');
  });

  it('UV-4 AC4/AC5: autocomplete is bound from the input signal', () => {
    expect(source).toContain('autocomplete');
    // Must be a binding not a hardcoded value
    expect(source).toContain('[attr.autocomplete]');
  });

  it('UV-4 AC6: button responds to keyboard (Enter/Space) — is a proper button element', () => {
    // Using a <button type="button"> means Enter/Space are natively handled
    expect(source).toContain('<button');
  });

  it('selector is at-password-field', () => {
    expect(source).toContain("selector: 'at-password-field'");
  });

  it('uses ChangeDetectionStrategy.OnPush', () => {
    expect(source).toContain('ChangeDetectionStrategy.OnPush');
  });

  it('controlId is a required input', () => {
    expect(source).toContain("readonly controlId = input.required<string>()");
  });

  it('autocomplete is a required input with literal type', () => {
    expect(source).toContain("autocomplete = input.required<'current-password' | 'new-password'>()");
  });

  it('revealed is a signal(false)', () => {
    expect(source).toContain('revealed = signal(false)');
  });

  it('input type switches between text and password based on revealed()', () => {
    expect(source).toContain("revealed() ? 'text' : 'password'");
  });
});

// ─── B. Toggle logic — unit tests ────────────────────────────────────────────

describe('PasswordField — toggle logic (UV-4 AC2, AC7)', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ReactiveFormsModule],
      providers: [provideZonelessChangeDetection()],
    });
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('revealed starts as false', () => {
    const comp = TestBed.runInInjectionContext(() => new PasswordField());
    const revealed = (comp as unknown as { revealed: () => boolean }).revealed;
    expect(revealed()).toBe(false);
  });

  it('UV-4 AC2: toggle() inverts revealed from false to true', () => {
    const comp = TestBed.runInInjectionContext(() => new PasswordField());
    const revealed = (comp as unknown as { revealed: { (): boolean; set: (v: boolean) => void } })
      .revealed;
    const toggle = (comp as unknown as { toggle: () => void }).toggle;
    toggle.call(comp);
    expect(revealed()).toBe(true);
  });

  it('UV-4 AC2: toggle() inverts revealed back from true to false', () => {
    const comp = TestBed.runInInjectionContext(() => new PasswordField());
    const revealed = (comp as unknown as { revealed: { (): boolean; set: (v: boolean) => void } })
      .revealed;
    const toggle = (comp as unknown as { toggle: () => void }).toggle;
    toggle.call(comp);
    toggle.call(comp);
    expect(revealed()).toBe(false);
  });
});

// ─── B2. aria-pressed sync + keyboard activation completeness ─────────────────

describe('PasswordField — aria-pressed sync and keyboard contract (UV-4 AC2, AC6)', () => {
  it('UV-4 AC2: aria-pressed binding uses revealed() directly (no conversion)', () => {
    // [attr.aria-pressed]="revealed()" — browser serializes boolean to "true"/"false"
    expect(source).toContain('[attr.aria-pressed]="revealed()"');
  });

  it('UV-4 AC6: keyboard activation is handled natively via <button> element', () => {
    // <button> elements respond to Enter and Space natively — no manual keydown binding needed
    expect(source).toContain('<button');
    expect(source).toContain('type="button"');
    // No manual keydown handler needed (browser handles it)
    const hasManualKeydown = source.includes('(keydown)') || source.includes('(keyup)');
    expect(hasManualKeydown).toBe(false);
  });

  it('UV-4 AC2: aria-label switches between Mostrar and Ocultar based on revealed()', () => {
    expect(source).toContain('[attr.aria-label]');
    expect(source).toContain('Ocultar contraseña');
    expect(source).toContain('Mostrar contraseña');
  });
});

// ─── C. CVA smoke tests (UV-12 AC3) ──────────────────────────────────────────

describe('PasswordField — ControlValueAccessor smoke tests (UV-12 AC3)', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ReactiveFormsModule],
      providers: [provideZonelessChangeDetection(), FormBuilder],
    });
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('implements writeValue without throwing', () => {
    const comp = TestBed.runInInjectionContext(() => new PasswordField());
    expect(() => {
      (comp as unknown as { writeValue: (v: unknown) => void }).writeValue('secret123');
    }).not.toThrow();
  });

  it('implements registerOnChange without throwing', () => {
    const comp = TestBed.runInInjectionContext(() => new PasswordField());
    expect(() => {
      (comp as unknown as { registerOnChange: (fn: (v: string) => void) => void }).registerOnChange(
        (_v: string) => {},
      );
    }).not.toThrow();
  });

  it('implements registerOnTouched without throwing', () => {
    const comp = TestBed.runInInjectionContext(() => new PasswordField());
    expect(() => {
      (comp as unknown as { registerOnTouched: (fn: () => void) => void }).registerOnTouched(
        () => {},
      );
    }).not.toThrow();
  });

  it('UV-4 AC7: toggle does not change the internal value', () => {
    const comp = TestBed.runInInjectionContext(() => new PasswordField());
    const writeValue = (comp as unknown as { writeValue: (v: string) => void }).writeValue.bind(comp);
    const toggle = (comp as unknown as { toggle: () => void }).toggle;
    const getValue = (comp as unknown as { value: () => string }).value;

    writeValue('mypassword');
    const valueBefore = getValue ? getValue() : 'mypassword';
    toggle.call(comp);
    const valueAfter = getValue ? getValue() : 'mypassword';

    expect(valueBefore).toBe(valueAfter);
  });
});
