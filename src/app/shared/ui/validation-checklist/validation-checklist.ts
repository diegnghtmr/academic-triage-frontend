import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * Discriminated union for checklist rule kind.
 * - 'hard': contractual rule that blocks submit when not satisfied.
 * - 'advisory': guidance item shown as a hint; never blocks submit.
 */
export type RuleKind = 'hard' | 'advisory';

/**
 * A single validation checklist rule.
 */
export interface ChecklistRule {
  readonly id: string;
  readonly label: string;
  readonly satisfied: boolean;
  readonly kind: RuleKind;
}

/**
 * ValidationChecklist — docket-style analizador de validación.
 *
 * Renders pending validation rules in terminal/institutional style:
 *   [ revisar ] 3 campos necesitan atención
 *   ▸ Contraseña — mínimo 8 caracteres   (hard, pending)
 *   ▸ Descripción — más contexto ayuda   (advisory, pending)
 *
 * ARIA: aria-live="polite" — informative, NOT assertive. Never uses role=alert.
 * Satisfied items are visually muted; hard pending items are highlighted.
 *
 * REQ-TOKENS: only --at-* tokens used.
 * REQ-NO-LIBS: built with Angular 20 signals only.
 * Design §D-6: 100% data-driven — no business logic in this primitive.
 */
@Component({
  selector: 'at-validation-checklist',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    :host {
      display: block;
    }

    .validation-checklist {
      border-top: 1px solid var(--at-border);
      padding: var(--at-s3) var(--at-s4);
      font-family: var(--at-font-mono);
      font-size: var(--at-fs-sm);
    }

    .validation-checklist__heading {
      color: var(--at-warning);
      margin-bottom: var(--at-s2);
    }

    .validation-checklist__list {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .validation-checklist__rule {
      color: var(--at-text-muted);
      margin-bottom: var(--at-s1);
    }

    .validation-checklist__rule--pending-hard {
      color: var(--at-danger);
    }

    .validation-checklist__rule--pending-advisory {
      color: var(--at-warning);
    }

    .validation-checklist__rule--satisfied {
      color: var(--at-text-dim);
      text-decoration: line-through;
    }
  `,
  template: `
    <section aria-label="Diagnóstico de validación" aria-live="polite">
      @if (pending().length > 0) {
        <p class="validation-checklist__heading">
          [ revisar ] {{ pending().length }} {{ title() }}
        </p>
      }
      <ul class="validation-checklist__list">
        @for (rule of rules(); track rule.id) {
          @if (rule.satisfied) {
            <li
              class="validation-checklist__rule validation-checklist__rule--satisfied"
              [attr.aria-label]="'cumplido: ' + rule.label"
            >
              {{ rule.label }}
            </li>
          } @else {
            <li [class]="pendingRuleClass(rule)" [attr.aria-label]="'pendiente: ' + rule.label">
              ▸ {{ rule.label }}
            </li>
          }
        }
      </ul>
    </section>
  `,
})
export class ValidationChecklist {
  /** All validation rules to display. Provided by the consumer as a computed. */
  readonly rules = input.required<readonly ChecklistRule[]>();

  /** Text displayed in the header after the count (e.g. "campos necesitan atención"). */
  readonly title = input('campos necesitan atención');

  /** Pending (unsatisfied) rules — used to compute the heading count. */
  protected readonly pending = computed(() => this.rules().filter((r) => !r.satisfied));

  /** Pending hard rules — consumers use this to determine if submit should be blocked. */
  readonly pendingHard = computed(() => this.pending().filter((r) => r.kind === 'hard'));

  /** CSS class for a pending rule based on kind. */
  protected pendingRuleClass(rule: ChecklistRule): string {
    const base = 'validation-checklist__rule';
    if (rule.kind === 'hard') return `${base} ${base}--pending-hard`;
    return `${base} ${base}--pending-advisory`;
  }
}
