import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'at-error-alert',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (message()) {
      <p role="alert">{{ message() }}</p>
    }
  `,
})
export class ErrorAlert {
  readonly message = input<string | null>(null);
}
