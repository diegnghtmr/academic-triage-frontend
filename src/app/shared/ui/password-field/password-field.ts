import {
  ChangeDetectionStrategy,
  Component,
  forwardRef,
  input,
  signal,
} from '@angular/core';
import type { ControlValueAccessor } from '@angular/forms';
import { NG_VALUE_ACCESSOR } from '@angular/forms';

/**
 * PasswordField — accessible password input with show/hide toggle.
 *
 * Design §PasswordField / R-T6 decision:
 * Uses ControlValueAccessor to integrate cleanly with `[formControlName]`.
 * Toggle only changes the display type (text|password), never the value or payload.
 * No FormsModule import — CVA wiring is via NG_VALUE_ACCESSOR + native input events.
 *
 * ARIA contract (UV-4):
 * - Button is type="button" (AC1).
 * - aria-pressed reflects revealed() state (AC2).
 * - aria-label switches between "Mostrar contraseña" and "Ocultar contraseña" (AC3).
 * - autocomplete bound from input signal — preserved through toggle (AC4, AC5).
 * - Keyboard: button element handles Enter/Space natively (AC6).
 * - Toggle does not mutate the value (AC7).
 */
@Component({
  selector: 'at-password-field',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => PasswordField),
      multi: true,
    },
  ],
  template: `
    <div class="password-field">
      <input
        class="input"
        [id]="controlId()"
        [type]="revealed() ? 'text' : 'password'"
        [attr.autocomplete]="autocomplete()"
        [attr.aria-describedby]="ariaDescribedBy()"
        [attr.aria-invalid]="ariaInvalid() || null"
        [attr.aria-required]="ariaRequired() || null"
        [placeholder]="placeholder()"
        [value]="value()"
        (input)="onInput($event)"
        (blur)="onTouched()"
      />
      <button
        type="button"
        class="password-field__toggle"
        [attr.aria-pressed]="revealed()"
        [attr.aria-label]="revealed() ? 'Ocultar contraseña' : 'Mostrar contraseña'"
        (click)="toggle()"
      >
        {{ revealed() ? 'Ocultar' : 'Mostrar' }}
      </button>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    .password-field {
      display: flex;
      gap: var(--at-s2);
      align-items: center;
    }
    .password-field__toggle {
      background: none;
      border: 1px solid var(--at-border);
      padding: var(--at-s1) var(--at-s2);
      font-family: var(--at-font-mono);
      font-size: var(--at-fs-xs);
      color: var(--at-text-muted);
      cursor: pointer;
      white-space: nowrap;
    }
    .password-field__toggle:focus-visible {
      outline: 1px solid var(--at-mercury);
    }
  `,
})
export class PasswordField implements ControlValueAccessor {
  readonly controlId = input.required<string>();
  readonly autocomplete = input.required<'current-password' | 'new-password'>();
  readonly placeholder = input('');
  readonly ariaDescribedBy = input<string | null>(null);
  readonly ariaInvalid = input(false);
  readonly ariaRequired = input(false);

  protected readonly revealed = signal(false);
  protected readonly value = signal('');

  private onChange: (value: string) => void = () => {};
  protected onTouched: () => void = () => {};

  protected toggle(): void {
    this.revealed.set(!this.revealed());
  }

  protected onInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const newValue = input.value;
    this.value.set(newValue);
    this.onChange(newValue);
  }

  // ControlValueAccessor implementation

  writeValue(value: unknown): void {
    this.value.set(typeof value === 'string' ? value : '');
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(_isDisabled: boolean): void {
    // Disabled state not needed for S1a — can be added in later slices
  }
}
