import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

/**
 * Item shape for the ErrorSummary component.
 * Exported for consumers to construct typed lists.
 */
export interface ErrorSummaryItem {
  readonly field: string | null;
  readonly message: string;
  readonly controlId?: string;
}

/**
 * ErrorSummary — accessible error list that summarizes form validation failures.
 *
 * Design §ErrorSummary:
 * - Only renders when items.length > 0 (no role="alert" noise on empty state).
 * - role="alert" + aria-live="assertive" for assertive announcement.
 * - tabindex="-1" for programmatic focus after submit.
 * - `focusFirst` output delegates focus management to the consumer.
 * - Docket style: prefix `[ revisar ]`, bullets `▸`.
 */
@Component({
  selector: 'at-error-summary',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (hasErrors()) {
      <section role="alert" aria-live="assertive" tabindex="-1" class="error-summary">
        <p class="error-summary__heading">[ revisar ] {{ headline() }}</p>
        <ul class="error-summary__list">
          @for (item of items(); track item.message) {
            <li class="error-summary__item">
              <button type="button" class="error-summary__btn" (click)="onItemClick(item)">
                ▸ {{ item.message }}
              </button>
            </li>
          }
        </ul>
      </section>
    }
  `,
  styles: `
    :host {
      display: block;
    }
    .error-summary {
      background: var(--at-err-bg);
      border: 1px solid var(--at-danger);
      padding: var(--at-s3) var(--at-s4);
      font-family: var(--at-font-mono);
      font-size: var(--at-fs-sm);
    }
    .error-summary__heading {
      margin: 0 0 var(--at-s2);
      color: var(--at-warning);
      font-weight: 700;
    }
    .error-summary__list {
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .error-summary__btn {
      background: none;
      border: none;
      padding: 0;
      cursor: pointer;
      color: var(--at-danger);
      font-family: var(--at-font-mono);
      font-size: var(--at-fs-sm);
      text-align: left;
    }
    .error-summary__btn:focus-visible {
      outline: 1px solid var(--at-mercury);
    }
  `,
})
export class ErrorSummary {
  readonly items = input.required<readonly ErrorSummaryItem[]>();
  readonly headline = input('Revisa los siguientes errores.');
  readonly focusFirst = output<ErrorSummaryItem>();

  protected readonly hasErrors = computed(() => this.items().length > 0);

  protected onItemClick(item: ErrorSummaryItem): void {
    this.focusFirst.emit(item);
  }
}
