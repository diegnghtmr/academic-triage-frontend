import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * CharacterCounter — displays current character count relative to min/max limits.
 *
 * ARIA: role="status" + aria-live="polite" so screen readers announce changes
 * without interrupting the user (UV-5 AC5, design §CharacterCounter).
 *
 * REQ-TOKENS: only --at-* tokens used; no arbitrary colors.
 * REQ-NO-LIBS: built with Angular 20 signals only.
 */
@Component({
  selector: 'at-character-counter',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    :host {
      display: block;
    }

    .character-counter {
      font-family: var(--at-font-mono);
      font-size: var(--at-fs-xs);
      color: var(--at-text-muted);
      margin-top: var(--at-s1);
    }

    .character-counter--short {
      color: var(--at-warning);
    }

    .character-counter--over {
      color: var(--at-danger);
    }
  `,
  template: `
    <span
      role="status"
      aria-live="polite"
      [class]="counterClass()"
    >
      {{ length() }} / {{ max() }}
      @if (min() !== null && state() === 'short') {
        <span> (mínimo {{ min() }})</span>
      }
      @if (state() === 'over') {
        <span> (máximo {{ max() }})</span>
      }
    </span>
  `,
})
export class CharacterCounter {
  /** Current text value to measure. */
  readonly value = input<string>('');

  /** Optional minimum character count. When null, "short" state is not triggered. */
  readonly min = input<number | null>(null);

  /** Maximum character count (required). */
  readonly max = input.required<number>();

  /** Computed character count derived from value. */
  protected readonly length = computed(() => this.value().length);

  /**
   * Computed state:
   * - 'short': length is below min (only when min is set)
   * - 'over':  length exceeds max
   * - 'ok':    within acceptable range
   */
  protected readonly state = computed<'ok' | 'short' | 'over'>(() => {
    const len = this.length();
    const min = this.min();
    const max = this.max();

    if (len > max) return 'over';
    if (min !== null && len < min) return 'short';
    return 'ok';
  });

  /** CSS class for visual state indication. */
  protected readonly counterClass = computed(() => {
    const s = this.state();
    if (s === 'over') return 'character-counter character-counter--over';
    if (s === 'short') return 'character-counter character-counter--short';
    return 'character-counter';
  });
}
