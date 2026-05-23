import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'at-pagination-nav',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    :host {
      display: block;
    }

    nav {
      display: flex;
      align-items: center;
      gap: var(--at-s4);
      padding: var(--at-s3) 0;
      border-top: 1px solid var(--at-border);
      margin-top: var(--at-s2);
    }

    button {
      background: transparent;
      border: 1px solid var(--at-border-hi);
      border-radius: var(--at-radius);
      color: var(--at-text-muted);
      font-family: var(--at-font-mono);
      font-size: var(--at-fs-xs);
      padding: var(--at-s1) var(--at-s3);
      cursor: pointer;
      transition:
        border-color var(--at-dur-fast) var(--at-ease),
        color var(--at-dur-fast) var(--at-ease);

      &:not([disabled]):hover {
        border-color: var(--at-mercury);
        color: var(--at-mercury);
      }

      &[disabled] {
        opacity: 0.38;
        cursor: not-allowed;
      }
    }

    span {
      color: var(--at-text-muted);
      font-family: var(--at-font-mono);
      font-size: var(--at-fs-xs);
      letter-spacing: 0.06em;
      flex: 1;
      text-align: center;
    }
  `,
  template: `
    <nav aria-label="Paginación">
      <button
        type="button"
        (click)="prev.emit()"
        [disabled]="currentPage() <= 0 || loading()"
        aria-label="Página anterior"
      >
        ← Anterior
      </button>
      <span aria-live="polite" aria-atomic="true"
        >Página {{ currentPage() + 1 }} / {{ totalPages() || 1 }}</span
      >
      <button
        type="button"
        (click)="next.emit()"
        [disabled]="currentPage() >= totalPages() - 1 || loading()"
        aria-label="Página siguiente"
      >
        Siguiente →
      </button>
    </nav>
  `,
})
export class PaginationNav {
  readonly currentPage = input.required<number>();
  readonly totalPages = input.required<number>();
  readonly loading = input(false);
  readonly prev = output<void>();
  readonly next = output<void>();
}
