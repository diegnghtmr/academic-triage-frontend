import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'at-loading-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    :host { display: block; padding: var(--at-s4) 0; }

    p {
      margin: 0;
      color: var(--at-text-muted);
      font-size: var(--at-fs-sm);
      letter-spacing: 0.05em;
    }

    p::before {
      content: '▸ ';
      color: var(--at-accent);
    }
  `,
  template: `<p>{{ message() }}</p>`,
})
export class LoadingState {
  readonly message = input('Cargando…');
}
