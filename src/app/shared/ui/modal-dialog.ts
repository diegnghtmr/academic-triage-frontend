import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  effect,
  inject,
  input,
  output,
} from '@angular/core';

@Component({
  selector: 'at-modal-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    :host { display: contents; }

    dialog {
      background: var(--at-surface);
      border: 1px solid var(--at-border-hi);
      border-radius: var(--at-radius);
      color: var(--at-text);
      padding: var(--at-s8);
      min-width: 320px;
      max-width: 480px;
      width: 90vw;
      box-shadow: var(--at-shadow-modal);
      animation: fade var(--at-dur) var(--at-ease) both;

      &::backdrop {
        background: var(--at-backdrop);
        backdrop-filter: blur(2px);
      }
    }

    .modal__title {
      margin: 0 0 var(--at-s4);
      font-size: var(--at-fs-lg);
      font-weight: 800;
      letter-spacing: var(--at-tracking-tight);
      color: var(--at-text);
    }

    .modal__body {
      font-size: var(--at-fs-sm);
      color: var(--at-text-muted);
      margin-bottom: var(--at-s6);
    }

    .modal__actions {
      display: flex;
      gap: var(--at-s3);
      justify-content: flex-end;
    }

    .btn--confirm {
      background: var(--at-surface-2);
      border: 1px solid var(--at-mercury);
      color: var(--at-mercury);
      padding: var(--at-s2) var(--at-s5);
      font-family: inherit;
      font-size: var(--at-fs-sm);
      cursor: pointer;
      border-radius: var(--at-radius);
      transition: background var(--at-dur-fast) var(--at-ease);

      &:hover {
        background: var(--at-border);
      }
    }

    .btn--cancel {
      background: transparent;
      border: 1px solid var(--at-border-hi);
      color: var(--at-text-muted);
      padding: var(--at-s2) var(--at-s5);
      font-family: inherit;
      font-size: var(--at-fs-sm);
      cursor: pointer;
      border-radius: var(--at-radius);
      transition: border-color var(--at-dur-fast) var(--at-ease);

      &:hover {
        border-color: var(--at-text-muted);
      }
    }
  `,
  template: `
    <dialog #dialog [attr.aria-labelledby]="titleId" (close)="onNativeClose()">
      <h2 [id]="titleId" class="modal__title">{{ title() }}</h2>
      <div class="modal__body">
        <ng-content />
      </div>
      <div class="modal__actions">
        <button type="button" class="btn--cancel" (click)="modalCancel.emit()">
          {{ cancelLabel() }}
        </button>
        <button type="button" class="btn--confirm" (click)="confirm.emit()">
          {{ confirmLabel() }}
        </button>
      </div>
    </dialog>
  `,
})
export class ModalDialog {
  readonly open         = input.required<boolean>();
  readonly title        = input.required<string>();
  readonly confirmLabel = input<string>('Confirmar');
  readonly cancelLabel  = input<string>('Cancelar');

  readonly confirm      = output<void>();
  readonly modalCancel  = output<void>();

  protected readonly titleId = `at-modal-title-${
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2, 11)
  }`;

  private readonly el = inject(ElementRef);

  protected onNativeClose(): void {
    if (this.open()) this.modalCancel.emit();
  }

  private readonly _openEffect = effect(() => {
    const dialog = this.el.nativeElement.querySelector('dialog') as HTMLDialogElement | null;
    if (dialog === null) return;
    if (this.open()) {
      if (!dialog.open) dialog.showModal();
    } else {
      if (dialog.open) dialog.close();
    }
  });
}
