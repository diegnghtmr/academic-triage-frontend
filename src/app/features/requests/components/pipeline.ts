import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import type { RequestStatusEnum } from '../models/request-api.types';

const PIPELINE_NODES: RequestStatusEnum[] = [
  'REGISTERED',
  'CLASSIFIED',
  'IN_PROGRESS',
  'ATTENDED',
  'CLOSED',
];

const NODE_LABELS: Record<string, string> = {
  REGISTERED: 'Registrada',
  CLASSIFIED: 'Clasificada',
  IN_PROGRESS: 'En progreso',
  ATTENDED: 'Atendida',
  CLOSED: 'Cerrada',
};

@Component({
  selector: 'at-pipeline',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pipeline" role="list" aria-label="Estado de la solicitud">
      @for (node of nodes(); track node.status) {
        <div
          class="pipeline__node"
          [class.pipeline__node--done]="node.done"
          [class.pipeline__node--active]="node.active"
          role="listitem"
          [attr.aria-current]="node.active ? 'step' : null"
        >
          <span class="pipeline__dot"></span>
          <span class="pipeline__label">{{ node.label }}</span>
        </div>
        @if (!node.last) {
          <div class="pipeline__connector" aria-hidden="true"></div>
        }
      }
    </div>
  `,
  styles: `
    .pipeline {
      display: flex;
      align-items: center;
      gap: 0;
      overflow-x: auto;
      padding: var(--at-s2) 0;
      margin-bottom: var(--at-s3);
    }
    .pipeline__node {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--at-s1);
      min-width: 80px;
    }
    .pipeline__dot {
      width: 12px;
      height: 12px;
      border: 1px solid var(--at-border-hi);
      background: var(--at-surface-2);
      display: block;
    }
    .pipeline__node--done .pipeline__dot {
      background: var(--at-text-muted);
      border-color: var(--at-text-muted);
    }
    .pipeline__node--active .pipeline__dot {
      background: var(--at-mercury);
      border-color: var(--at-mercury);
    }
    .pipeline__label {
      font-size: var(--at-fs-xs);
      font-family: var(--at-font-mono);
      color: var(--at-text-muted);
      text-align: center;
    }
    .pipeline__node--active .pipeline__label {
      color: var(--at-mercury);
      font-weight: 600;
    }
    .pipeline__connector {
      flex: 1;
      height: 1px;
      background: var(--at-border-hi);
      min-width: 16px;
    }
  `,
})
export class Pipeline {
  readonly currentStatus = input.required<RequestStatusEnum>();

  protected readonly nodes = computed(() => {
    const current = this.currentStatus();
    const currentIdx = PIPELINE_NODES.indexOf(current);
    return PIPELINE_NODES.map((status, idx) => ({
      status,
      label: NODE_LABELS[status] ?? status,
      done: idx < currentIdx,
      active: idx === currentIdx,
      last: idx === PIPELINE_NODES.length - 1,
    }));
  });
}
