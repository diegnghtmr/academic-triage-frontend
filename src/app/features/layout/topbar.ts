import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';

@Component({
  selector: 'at-topbar',
  host: { role: 'banner' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    :host {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      grid-column: 2;
      grid-row: 1;
      height: 48px;
      padding: 0 var(--at-s6);
      background: var(--at-surface);
      border-bottom: 1px solid var(--at-border);
      gap: var(--at-s4);
      flex-shrink: 0;
    }

    .session-chip {
      display: flex;
      align-items: center;
      gap: var(--at-s2);
      font-family: var(--at-font-mono);
      font-size: var(--at-fs-xs);
      color: var(--at-text-muted);
      letter-spacing: 0.04em;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 280px;
    }

    .session-chip::before {
      content: '▸';
      color: var(--at-mercury);
      flex-shrink: 0;
    }

    .btn--logout {
      background: transparent;
      border: 1px solid var(--at-border-hi);
      border-radius: var(--at-radius);
      color: var(--at-text-muted);
      font-family: var(--at-font-sans);
      font-size: var(--at-fs-xs);
      padding: var(--at-s1) var(--at-s3);
      cursor: pointer;
      white-space: nowrap;
      transition: border-color var(--at-dur-fast) var(--at-ease),
                  color var(--at-dur-fast) var(--at-ease);

      &:hover {
        border-color: var(--at-danger);
        color: var(--at-danger);
      }
    }
  `,
  template: `
    <span class="session-chip" [title]="sessionLabel()">{{ sessionLabel() }}</span>
    <button type="button" class="btn--logout" (click)="logoutRequest.emit()">
      Cerrar sesión
    </button>
  `,
})
export class Topbar {
  readonly sessionLabel  = input.required<string>();
  readonly logoutRequest = output<void>();
}
