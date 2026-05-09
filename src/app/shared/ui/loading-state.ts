import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'at-loading-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    :host { display: block; padding: var(--at-s4) 0; }

    .skel {
      display: flex;
      flex-direction: column;
      gap: var(--at-s3);
    }

    .skel__row {
      background: var(--at-surface-2);
      height: 1rem;
      animation: skelpulse 1.4s ease-in-out infinite;
    }

    p {
      margin: 0;
      color: var(--at-text-muted);
      font-family: var(--at-font-mono);
      font-size: var(--at-fs-sm);
      letter-spacing: 0.05em;
    }

    p::before {
      content: '▸ ';
      color: var(--at-mercury);
    }
  `,
  template: `<p>{{ message() }}</p>`,
})
export class LoadingState {
  readonly message = input('Cargando…');
}
