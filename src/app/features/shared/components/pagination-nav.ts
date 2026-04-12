import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';

@Component({
  selector: 'at-pagination-nav',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    :host { display: block; }

    nav {
      display: flex;
      align-items: center;
      gap: var(--at-s4);
      padding: var(--at-s3) 0;
      border-top: 1px solid var(--at-border);
      margin-top: var(--at-s2);
    }

    span {
      color: var(--at-text-muted);
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
      <span aria-live="polite" aria-atomic="true">Página {{ currentPage() + 1 }} / {{ totalPages() || 1 }}</span>
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
