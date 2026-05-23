import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'at-empty-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    :host {
      display: block;
      padding: var(--at-s6) 0;
    }

    .qempty {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--at-s4);
      padding: var(--at-s8);
      border: 1px dashed var(--at-border-hi);
    }

    .qempty__art {
      font-family: var(--at-font-mono);
      font-size: var(--at-fs-xs);
      color: var(--at-text-dim);
      white-space: pre;
      line-height: 1.3;
      user-select: none;
    }

    p {
      margin: 0;
      color: var(--at-text-muted);
      font-family: var(--at-font-mono);
      font-size: var(--at-fs-sm);
      letter-spacing: 0.04em;
    }
  `,
  template: `
    <div class="qempty">
      <pre class="qempty__art" aria-hidden="true"> [ ] </pre>
      <p>{{ message() }}</p>
    </div>
  `,
})
export class EmptyState {
  readonly message = input.required<string>();
}
