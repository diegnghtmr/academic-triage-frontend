import * as React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

export interface ConfirmDialogProps {
  /** Trigger element (uncontrolled mode) */
  trigger?: React.ReactNode;
  /** Children rendered inside the dialog body (controlled mode) */
  children?: React.ReactNode;
  /** Dialog title (Spanish) */
  title: string;
  /** Description / confirmation prompt */
  description?: string;
  /** Confirm button label */
  confirmLabel?: string;
  /** Cancel button label */
  cancelLabel?: string;
  /** Called when user confirms */
  onConfirm: () => void;
  /** Called when user cancels / closes */
  onCancel?: () => void;
  /** Alias for onCancel */
  onClose?: () => void;
  /** Destructive action styling */
  destructive?: boolean;
  /** Controlled open state */
  open?: boolean;
  /** Controlled open change */
  onOpenChange?: (open: boolean) => void;
}

export function ConfirmDialog({
  trigger,
  children,
  title,
  description,
  confirmLabel = "CONFIRMAR",
  cancelLabel = "CANCELAR",
  onConfirm,
  onCancel,
  onClose,
  destructive = false,
  open,
  onOpenChange,
}: ConfirmDialogProps) {
  const handleCancel = onCancel || onClose;

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && handleCancel) {
      handleCancel();
    }
    onOpenChange?.(newOpen);
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      {trigger && <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>}
      <AlertDialogContent
        data-testid="confirm-dialog"
        className={cn(
          "bg-[#0A0A0A] border border-white p-0 max-w-md",
          "shadow-none"
        )}
      >
        {/* Decorative dither strip */}
        <div
          className="px-6 py-2 border-b border-white font-mono text-[8px] text-mercury opacity-20 select-none overflow-hidden whitespace-nowrap"
          aria-hidden="true"
        >
          ░▒▓▒░▒▓▒░▒▓▒░▒▓▒░▒▓▒░▒▓▒░▒▓▒░▒▓▒░▒▓▒░▒▓▒░▒▓▒░▒▓▒░▒▓▒░▒▓▒░▒▓▒░
        </div>

        <AlertDialogHeader className="px-6 pt-5 pb-0">
          <AlertDialogTitle
            className="font-mono text-sm uppercase tracking-wider text-foreground"
            data-testid="confirm-dialog-title"
          >
            {title}
          </AlertDialogTitle>
          {description && (
            <AlertDialogDescription
              className="font-mono text-xs text-mercury mt-3 leading-relaxed"
              data-testid="confirm-dialog-description"
            >
              <span className="text-mercury opacity-50">&gt;_ </span>
              {description}
            </AlertDialogDescription>
          )}
        </AlertDialogHeader>

        {/* Optional children content */}
        {children && (
          <div className="px-6 py-3">{children}</div>
        )}

        <AlertDialogFooter className="px-6 pb-5 pt-4 flex gap-3">
          <AlertDialogCancel
            className={cn(
              "ghost-border bg-transparent text-mercury font-mono text-xs uppercase tracking-wider",
              "hover:bg-[#1C1B1B] hover:text-foreground transition-colors",
              "px-4 py-2"
            )}
            onClick={handleCancel}
            data-testid="confirm-dialog-cancel"
          >
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            className={cn(
              "font-mono text-xs uppercase tracking-wider px-4 py-2 transition-colors",
              destructive
                ? "bg-[#FFB4AB] text-[#0A0A0A] hover:bg-[#FF9A8F]"
                : "bg-white text-[#0A0A0A] hover:bg-[#E0E0E0]"
            )}
            onClick={onConfirm}
            data-testid="confirm-dialog-confirm"
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
