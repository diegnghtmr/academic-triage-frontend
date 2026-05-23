import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';

/**
 * Loading indicator with two modes:
 * - `skeleton` (default): pulsing rows that approximate the shape of a table.
 * - `text`: a single text line (`message`).
 *
 * Implements "delayed show": if the operation completes before `delayMs`,
 * the component never renders and the user sees no flash.
 */
@Component({
  selector: 'at-loading-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    :host {
      display: block;
      padding: var(--at-s4) 0;
    }

    .skel {
      display: flex;
      flex-direction: column;
      gap: var(--at-s2);
      background: transparent;
      border: 0;
      color: inherit;
      padding: 0;
      margin: 0;
    }

    .skel__row {
      background: linear-gradient(
        90deg,
        var(--at-surface) 0%,
        var(--at-surface-2) 50%,
        var(--at-surface) 100%
      );
      background-size: 200% 100%;
      height: 1.25rem;
      animation: skel-shimmer 1.4s ease-in-out infinite;
    }

    .skel__row:nth-child(1) {
      width: 100%;
    }
    .skel__row:nth-child(2) {
      width: 92%;
    }
    .skel__row:nth-child(3) {
      width: 96%;
    }
    .skel__row:nth-child(4) {
      width: 88%;
    }

    @keyframes skel-shimmer {
      0% {
        background-position: 100% 0;
      }
      100% {
        background-position: -100% 0;
      }
    }

    p {
      margin: 0;
      color: var(--at-text-muted);
      font-family: var(--at-font-mono);
      font-size: var(--at-fs-sm);
      letter-spacing: 0.05em;
    }

    p::before {
      content: '▸ ';
      color: var(--at-mercury);
    }
  `,
  template: `
    @if (visible()) {
      @if (variant() === 'text') {
        <p>{{ message() }}</p>
      } @else {
        <div class="skel" role="status" [attr.aria-label]="message()">
          <span class="skel__row"></span>
          <span class="skel__row"></span>
          <span class="skel__row"></span>
          <span class="skel__row"></span>
        </div>
      }
    }
  `,
})
export class LoadingState {
  readonly variant = input<'skeleton' | 'text'>('skeleton');
  readonly message = input('Cargando…');
  readonly delayMs = input(200);

  private readonly mounted = signal(false);
  protected readonly visible = computed(() => this.mounted());

  constructor() {
    const destroyRef = inject(DestroyRef);
    const handle = setTimeout(() => this.mounted.set(true), this.delayMs());
    destroyRef.onDestroy(() => clearTimeout(handle));
  }
}
