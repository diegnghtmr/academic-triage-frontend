import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import type { RequestStatusEnum } from '@features/requests/models/request-api.types';

const STATUS_CLASS_MAP: Record<RequestStatusEnum, string> = {
  REGISTERED:  'badge--registered',
  CLASSIFIED:  'badge--classified',
  IN_PROGRESS: 'badge--in-progress',
  ATTENDED:    'badge--attended',
  CLOSED:      'badge--closed',
  CANCELLED:   'badge--cancelled',
  REJECTED:    'badge--rejected',
};

export const STATUS_LABEL_MAP: Record<RequestStatusEnum, string> = {
  REGISTERED:  'Registrada',
  CLASSIFIED:  'Clasificada',
  IN_PROGRESS: 'En progreso',
  ATTENDED:    'Atendida',
  CLOSED:      'Cerrada',
  CANCELLED:   'Cancelada',
  REJECTED:    'Rechazada',
};

@Component({
  selector: 'at-state-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    .badge {
      display: inline-block;
      font-family: var(--at-font-mono);
      font-size: var(--at-fs-xs);
      letter-spacing: var(--at-tracking-wide);
      text-transform: uppercase;
      padding: 1px var(--at-s2);
      border: 1px solid currentColor;
    }

    .badge--registered  { color: var(--at-mercury); }
    .badge--classified  { color: var(--at-info); }
    .badge--in-progress { color: var(--at-warning); }
    .badge--attended    { color: var(--at-success); }
    .badge--closed      { color: var(--at-text-muted); }
    .badge--cancelled   { color: var(--at-text-muted); }
    .badge--rejected    { color: var(--at-danger); }
  `,
  template: `<span class="badge" [class]="badgeClass()">{{ label() }}</span>`,
})
export class StateBadge {
  readonly state   = input.required<RequestStatusEnum>();
  readonly compact = input<boolean>(false);

  protected readonly badgeClass = computed(
    () => `badge ${STATUS_CLASS_MAP[this.state()]}`,
  );

  protected readonly label = computed(() => STATUS_LABEL_MAP[this.state()]);
}
