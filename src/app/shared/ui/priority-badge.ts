import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { PriorityEnum } from '@shared/models/priority';

const PRI_CLASS_MAP: Record<PriorityEnum, string> = {
  HIGH: 'pri--h',
  MEDIUM: 'pri--m',
  LOW: 'pri--l',
};

const PRI_LABEL_MAP: Record<PriorityEnum, string> = {
  HIGH: 'Alta',
  MEDIUM: 'Media',
  LOW: 'Baja',
};

@Component({
  selector: 'at-priority-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    .pri {
      display: inline-block;
      font-family: var(--at-font-mono);
      font-size: var(--at-fs-xs);
      letter-spacing: var(--at-tracking-wide);
      text-transform: uppercase;
      padding: 1px var(--at-s2);
      border: 1px solid currentColor;
    }

    .pri--h {
      color: var(--at-danger);
    }
    .pri--m {
      color: var(--at-warning);
    }
    .pri--l {
      color: var(--at-text-muted);
    }
  `,
  template: `<span class="pri" [class]="priClass()">{{ label() }}</span>`,
})
export class PriorityBadge {
  readonly priority = input.required<PriorityEnum>();

  protected readonly priClass = computed(() => `pri ${PRI_CLASS_MAP[this.priority()]}`);

  protected readonly label = computed(() => PRI_LABEL_MAP[this.priority()]);
}
