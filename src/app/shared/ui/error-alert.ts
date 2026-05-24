import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * Variant for the alert component.
 * - error / warning → role="alert" (assertive)
 * - success / info  → role="status" (polite)
 */
export type AlertVariant = 'error' | 'success' | 'warning' | 'info';

@Component({
  selector: 'at-error-alert',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    :host {
      display: contents;
    }

    p[role='alert'] {
      background: var(--at-err-bg);
      border: 1px solid var(--at-danger);
      color: var(--at-danger);
      font-family: var(--at-font-mono);
      font-size: var(--at-fs-sm);
      padding: var(--at-s2) var(--at-s4);
      margin: var(--at-s2) 0;
    }

    p[role='alert'].alert--warning {
      background: rgba(232, 197, 51, 0.12);
      border-color: var(--at-warning);
      color: var(--at-warning);
    }

    p[role='status'] {
      background: var(--at-ok-bg);
      border: 1px solid var(--at-success);
      color: var(--at-success);
      font-family: var(--at-font-mono);
      font-size: var(--at-fs-sm);
      padding: var(--at-s2) var(--at-s4);
      margin: var(--at-s2) 0;
    }

    p[role='status'].alert--info {
      background: rgba(155, 143, 255, 0.1);
      border-color: var(--at-info);
      color: var(--at-info);
    }
  `,
  template: `
    @if (message()) {
      <p [attr.role]="role()" [class]="alertClass()">{{ message() }}</p>
    }
  `,
})
export class ErrorAlert {
  readonly message = input<string | null>(null);

  /** Alert variant — controls ARIA role and visual treatment. Default: 'error'. */
  readonly variant = input<AlertVariant>('error');

  /** Computed ARIA role: error → "alert"; success/warning/info → "status". */
  readonly role = computed<'alert' | 'status'>(() => {
    return this.variant() === 'error' ? 'alert' : 'status';
  });

  /** CSS class for additional variant-specific styling. */
  protected readonly alertClass = computed(() => {
    const v = this.variant();
    if (v === 'warning') return 'alert--warning';
    if (v === 'info') return 'alert--info';
    return '';
  });
}
