import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  computed,
  inject,
  input,
} from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

const PX_ICON_MAP = {
  dashboard: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
    <rect x="1" y="1" width="6" height="6"/>
    <rect x="9" y="1" width="6" height="6"/>
    <rect x="1" y="9" width="6" height="6"/>
    <rect x="9" y="9" width="6" height="6"/>
  </svg>`,
  list: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
    <rect x="1" y="2" width="14" height="2"/>
    <rect x="1" y="7" width="14" height="2"/>
    <rect x="1" y="12" width="14" height="2"/>
  </svg>`,
  plus: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
    <rect x="7" y="1" width="2" height="14"/>
    <rect x="1" y="7" width="14" height="2"/>
  </svg>`,
  users: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
    <rect x="2" y="1" width="5" height="5"/>
    <rect x="9" y="1" width="5" height="5"/>
    <rect x="0" y="10" width="7" height="5"/>
    <rect x="9" y="10" width="7" height="5"/>
  </svg>`,
  tag: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
    <path d="M1 1h7l7 7-7 7-7-7V1zm3 3a1 1 0 100-2 1 1 0 000 2z"/>
  </svg>`,
  channel: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
    <rect x="1" y="6" width="4" height="4"/>
    <rect x="6" y="3" width="4" height="10"/>
    <rect x="11" y="1" width="4" height="14"/>
  </svg>`,
  rules: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
    <rect x="1" y="1" width="14" height="2"/>
    <rect x="1" y="5" width="10" height="2"/>
    <rect x="1" y="9" width="12" height="2"/>
    <rect x="1" y="13" width="8" height="2"/>
  </svg>`,
  chart: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
    <rect x="1" y="10" width="3" height="5"/>
    <rect x="6" y="6" width="3" height="9"/>
    <rect x="11" y="2" width="3" height="13"/>
    <rect x="1" y="15" width="14" height="1"/>
  </svg>`,
  logo: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
    <rect x="1" y="1" width="14" height="2"/>
    <rect x="1" y="1" width="2" height="14"/>
    <rect x="7" y="5" width="8" height="2"/>
    <rect x="7" y="9" width="8" height="2"/>
    <rect x="1" y="13" width="14" height="2"/>
  </svg>`,
  close: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
    <path d="M2 2l12 12M14 2L2 14" stroke="currentColor" stroke-width="2" stroke-linecap="square"/>
  </svg>`,
} as const;

export type PxIconName = keyof typeof PX_ICON_MAP;

@Component({
  selector: 'at-px-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  styles: `
    at-px-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    at-px-icon > span > svg {
      display: block;
      width: var(--px-icon-size, 16px);
      height: var(--px-icon-size, 16px);
    }
  `,
  template: `<span [innerHTML]="safeSvg()" [style.--px-icon-size]="size() + 'px'"></span>`,
})
export class PxIcon {
  readonly name = input.required<PxIconName>();
  readonly size = input<16 | 20 | 24>(16);

  private readonly sanitizer = inject(DomSanitizer);

  protected readonly safeSvg = computed(
    (): SafeHtml =>
      this.sanitizer.bypassSecurityTrustHtml(PX_ICON_MAP[this.name()]),
  );
}
