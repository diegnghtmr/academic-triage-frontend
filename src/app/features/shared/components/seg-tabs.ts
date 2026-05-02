import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';

export interface SegTab {
  id: string;
  label: string;
  count?: number;
}

@Component({
  selector: 'at-seg-tabs',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    .seg {
      display: flex;
      gap: 0;
      border-bottom: 1px solid var(--at-border-hi);
      overflow-x: auto;
    }

    .seg__btn {
      background: transparent;
      border: none;
      border-bottom: 2px solid transparent;
      border-radius: 0;
      color: var(--at-text-muted);
      font-family: var(--at-font-sans);
      font-size: var(--at-fs-sm);
      letter-spacing: 0.03em;
      padding: var(--at-s2) var(--at-s4);
      cursor: pointer;
      white-space: nowrap;
      transition: color var(--at-dur-fast) var(--at-ease),
                  border-color var(--at-dur-fast) var(--at-ease);
      display: inline-flex;
      align-items: center;
      gap: var(--at-s2);

      &:hover {
        color: var(--at-text);
      }
    }

    .seg__btn--on {
      color: var(--at-text);
      border-bottom-color: var(--at-mercury);
    }

    .badge {
      display: inline-block;
      background: var(--at-surface-2);
      border: 1px solid var(--at-border-hi);
      color: var(--at-text-muted);
      font-size: var(--at-fs-xs);
      font-family: var(--at-font-mono);
      padding: 0 var(--at-s1);
      min-width: 1.25rem;
      text-align: center;
    }
  `,
  template: `
    <div role="group" [attr.aria-label]="groupLabel()" class="seg">
      @for (t of tabs(); track t.id) {
        <button
          type="button"
          class="seg__btn"
          [class.seg__btn--on]="t.id === activeId()"
          [attr.aria-pressed]="t.id === activeId()"
          (click)="activeIdChange.emit(t.id)"
        >
          {{ t.label }}
          @if (t.count !== undefined) {
            <span class="badge">{{ t.count }}</span>
          }
        </button>
      }
    </div>
  `,
})
export class SegTabs {
  readonly tabs       = input.required<ReadonlyArray<SegTab>>();
  readonly activeId   = input.required<string>();
  readonly groupLabel = input<string>('Filtros');

  readonly activeIdChange = output<string>();
}
