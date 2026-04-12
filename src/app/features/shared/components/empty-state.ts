import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'at-empty-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    :host { display: block; padding: var(--at-s6) 0; }

    p {
      margin: 0;
      color: var(--at-text-muted);
      font-size: var(--at-fs-sm);
      letter-spacing: 0.04em;
      border-left: 2px solid var(--at-border-hi);
      padding-left: var(--at-s3);
    }
  `,
  template: `<p>{{ message() }}</p>`,
})
export class EmptyState {
  readonly message = input.required<string>();
}
