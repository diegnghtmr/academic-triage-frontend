import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { DateTimeLabelPipe } from '@shared/pipes/date-time-label.pipe';
import { DisplayLabelPipe } from '@shared/pipes/display-label.pipe';

import type { HistoryEntryView } from '../models/request-detail-view';

@Component({
  selector: 'at-terminal-history',
  standalone: true,
  imports: [DateTimeLabelPipe, DisplayLabelPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="term" role="log" aria-label="Historial de la solicitud" aria-live="polite">
      @for (e of entries(); track e.id) {
        <div class="term__row">
          <span class="term__ts">{{ e.timestamp | dateTimeLabel }}</span>
          <span class="term__sep" aria-hidden="true"> — </span>
          <span class="term__action">{{ e.action | displayLabel: 'historyAction' }}</span>
          <span class="term__sep" aria-hidden="true"> (</span>
          <span class="term__user">{{ e.performedByName }}</span>
          <span class="term__sep" aria-hidden="true">)</span>
          @if (e.observations) {
            <p class="term__obs">{{ e.observations }}</p>
          }
        </div>
      }
    </div>
  `,
  styles: `
    .term {
      font-family: var(--at-font-mono);
      font-size: var(--at-fs-sm);
      background: var(--at-surface-2);
      border: 1px solid var(--at-border);
      padding: var(--at-s2) var(--at-s3);
      max-height: 320px;
      overflow-y: auto;
    }
    .term__row {
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      gap: 0;
      padding: var(--at-s1) 0;
      border-bottom: 1px solid var(--at-border);
    }
    .term__row:last-child {
      border-bottom: none;
    }
    .term__ts {
      color: var(--at-text-muted);
      min-width: 160px;
    }
    .term__sep {
      color: var(--at-border-hi);
    }
    .term__action {
      color: var(--at-mercury);
    }
    .term__user {
      color: var(--at-text);
    }
    .term__obs {
      width: 100%;
      margin: var(--at-s1) 0 0 0;
      padding-left: 160px;
      color: var(--at-text-muted);
      font-style: italic;
    }
  `,
})
export class TerminalHistory {
  readonly entries = input.required<HistoryEntryView[]>();
}
