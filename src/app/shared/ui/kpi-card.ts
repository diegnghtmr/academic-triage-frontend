import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'at-kpi-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    .kpi {
      display: flex;
      flex-direction: column;
      gap: var(--at-s2);
      background: var(--at-surface);
      border: 1px solid var(--at-border);
      padding: var(--at-s5) var(--at-s6);
      min-width: 140px;
    }

    .kpi__label {
      display: block;
      font-size: var(--at-fs-xs);
      font-family: var(--at-font-mono);
      text-transform: uppercase;
      letter-spacing: var(--at-tracking-wide);
      color: var(--at-text-muted);
    }

    .kpi__value {
      display: block;
      font-size: var(--at-fs-2xl);
      font-weight: 800;
      letter-spacing: var(--at-tracking-tight);
      color: var(--at-text);
      line-height: 1;
    }

    .kpi__delta {
      display: block;
      font-size: var(--at-fs-xs);
      font-family: var(--at-font-mono);
      color: var(--at-text-muted);
    }

    [data-tone='positive'] .kpi__value {
      color: var(--at-success);
    }
    [data-tone='negative'] .kpi__value {
      color: var(--at-danger);
    }
  `,
  template: `
    <div class="kpi" [attr.data-tone]="tone()">
      <span class="kpi__label">{{ label() }}</span>
      <span class="kpi__value">{{ value() }}</span>
      @if (delta() !== undefined) {
        <span class="kpi__delta">{{ delta() }}</span>
      }
    </div>
  `,
})
export class KpiCard {
  readonly label = input.required<string>();
  readonly value = input.required<string | number>();
  readonly delta = input<string | undefined>(undefined);
  readonly tone = input<'neutral' | 'positive' | 'negative'>('neutral');
}
