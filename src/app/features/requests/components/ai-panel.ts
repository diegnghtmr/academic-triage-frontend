import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'at-ai-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (summary() !== null || aiError() !== null) {
      <div class="ai" role="region" aria-label="Resumen generado por IA">
        @if (aiError() !== null) {
          <p class="ai__error">{{ aiError() }}</p>
        } @else {
          <p class="ai__text">{{ summary() }}<span class="ai__cursor" aria-hidden="true"></span></p>
          @if (generatedAt()) {
            <p class="ai__meta">Generado: {{ generatedAt() }}</p>
          }
        }
      </div>
    }
  `,
  styles: `
    .ai {
      background: var(--at-surface-2);
      border: 1px solid var(--at-border);
      padding: var(--at-s3) var(--at-s4);
      margin: var(--at-s3) 0;
      font-family: var(--at-font-mono);
      font-size: var(--at-fs-sm);
    }
    .ai__text {
      color: var(--at-text);
      line-height: 1.7;
      white-space: pre-wrap;
    }
    .ai__cursor {
      display: inline-block;
      width: 8px;
      height: 1em;
      background: var(--at-mercury);
      margin-left: 2px;
      vertical-align: text-bottom;
      animation: blink 1s step-end infinite;
    }
    .ai__error {
      color: var(--at-danger);
    }
    .ai__meta {
      color: var(--at-text-muted);
      font-size: var(--at-fs-xs);
      margin-top: var(--at-s2);
    }
  `,
})
export class AiPanel {
  readonly summary = input.required<string | null>();
  readonly generatedAt = input<string | undefined>(undefined);
  readonly aiError = input<string | null>(null);
}
