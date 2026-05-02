import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'at-error-alert',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    :host { display: contents; }

    p[role='alert'] {
      background: var(--at-err-bg);
      border: 1px solid var(--at-danger);
      color: var(--at-danger);
      font-family: var(--at-font-mono);
      font-size: var(--at-fs-sm);
      padding: var(--at-s2) var(--at-s4);
      margin: var(--at-s2) 0;
    }
  `,
  template: `
    @if (message()) {
      <p role="alert">{{ message() }}</p>
    }
  `,
})
export class ErrorAlert {
  readonly message = input<string | null>(null);
}
