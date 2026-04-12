import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'at-action-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    :host { display: block; margin-bottom: var(--at-s4); }

    .bar {
      display: flex;
      align-items: center;
      gap: var(--at-s3);
      flex-wrap: wrap;
    }
  `,
  template: `<div class="bar"><ng-content /></div>`,
})
export class ActionBar {}
