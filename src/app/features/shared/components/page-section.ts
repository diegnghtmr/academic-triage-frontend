import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'at-page-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    :host { display: block; }

    .header {
      display: flex;
      align-items: baseline;
      gap: var(--at-s4);
      padding-bottom: var(--at-s3);
      border-bottom: 1px solid var(--at-border-hi);
      margin-bottom: var(--at-s5);
    }

    .title {
      margin: 0;
      font-size: var(--at-fs-xl);
      font-weight: 800;
      letter-spacing: var(--at-tracking-tight);
      color: var(--at-text);
    }

    .body { }
  `,
  template: `
    <section>
      <header class="header">
        <h2 class="title">{{ title() }}</h2>
      </header>
      <div class="body">
        <ng-content />
      </div>
    </section>
  `,
})
export class PageSection {
  readonly title = input.required<string>();
}
