import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * FormField — accessible form field wrapper.
 *
 * Design §FormField: standalone, OnPush, only computed() for IDs.
 * API: label, controlId (required), required, hint, errorMessage, invalid.
 *
 * The projected `<input>` must bind:
 *   [attr.aria-describedby]="formField.describedBy()"
 *   [attr.aria-invalid]="formField.invalid()"
 *   [attr.aria-required]="formField.required()"
 */
@Component({
  selector: 'at-form-field',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="field">
      <label class="field__label" [for]="controlId()">
        {{ label() }}
        @if (required()) {
          <span class="field__req" aria-hidden="true"> *</span>
        }
      </label>

      @if (hint()) {
        <span class="field__hint" [id]="hintId()">{{ hint() }}</span>
      }

      <ng-content />

      @if (errorMessage()) {
        <span class="field__error" role="alert" [id]="errorId()">{{ errorMessage() }}</span>
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
  `,
})
export class FormField {
  readonly label = input.required<string>();
  readonly controlId = input.required<string>();
  readonly required = input(false);
  readonly hint = input<string | null>(null);
  readonly errorMessage = input<string | null>(null);
  readonly invalid = input(false);

  readonly hintId = computed(() => `${this.controlId()}-hint`);
  readonly errorId = computed(() => `${this.controlId()}-error`);

  /** Space-separated list of IDs for `aria-describedby`. Public for consumer input binding. */
  readonly describedBy = computed(() => {
    const parts: string[] = [];
    if (this.hint() !== null) {
      parts.push(this.hintId());
    }
    if (this.errorMessage() !== null) {
      parts.push(this.errorId());
    }
    return parts.length > 0 ? parts.join(' ') : null;
  });
}
