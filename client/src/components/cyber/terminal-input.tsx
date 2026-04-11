import * as React from "react";
import { cn } from "@/lib/utils";

export interface TerminalInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
  error?: string;
  /** Input type override; defaults to "text". Accepts both "type" and "inputType" */
  inputType?: React.HTMLInputTypeAttribute;
  type?: React.HTMLInputTypeAttribute;
}

export const TerminalInput = React.forwardRef<
  HTMLInputElement,
  TerminalInputProps
>(({ label, error, inputType, type, className, id, ...props }, ref) => {
  const inputId = id || React.useId();
  const resolvedType = inputType || type || "text";

  return (
    <div className={cn("w-full", className)} data-testid="terminal-input">
      {/* Label */}
      {label && (
        <label
          htmlFor={inputId}
          className="block text-[11px] font-mono uppercase tracking-wider text-mercury mb-2"
          data-testid="terminal-input-label"
        >
          {label}
        </label>
      )}

      {/* Input container */}
      <div
        className={cn(
          "flex items-center gap-0",
          "border-b transition-colors",
          error
            ? "border-[#FFB4AB]"
            : "border-[rgba(192,192,192,0.15)] focus-within:border-[rgba(192,192,192,0.4)]"
        )}
      >
        {/* Terminal prompt prefix */}
        <span
          className="font-mono text-sm text-mercury opacity-50 select-none shrink-0 pb-2"
          aria-hidden="true"
        >
          &gt;_
        </span>

        {/* Input field */}
        <input
          ref={ref}
          id={inputId}
          type={resolvedType}
          className={cn(
            "w-full bg-transparent font-mono text-sm text-foreground",
            "py-2 pl-2 pr-0",
            "outline-none border-none",
            "placeholder:text-mercury placeholder:opacity-30",
            "disabled:opacity-40 disabled:cursor-not-allowed"
          )}
          data-testid="terminal-input-field"
          {...props}
        />
      </div>

      {/* Error message */}
      {error && (
        <p
          className="mt-1.5 text-[11px] font-mono text-[#FFB4AB]"
          data-testid="terminal-input-error"
        >
          ! {error}
        </p>
      )}
    </div>
  );
});

TerminalInput.displayName = "TerminalInput";

/* ─── Textarea variant ───────────────────────────────────── */

export interface TerminalTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const TerminalTextarea = React.forwardRef<
  HTMLTextAreaElement,
  TerminalTextareaProps
>(({ label, error, className, id, ...props }, ref) => {
  const textareaId = id || React.useId();

  return (
    <div className={cn("w-full", className)} data-testid="terminal-textarea">
      {label && (
        <label
          htmlFor={textareaId}
          className="block text-[11px] font-mono uppercase tracking-wider text-mercury mb-2"
        >
          {label}
        </label>
      )}

      <div
        className={cn(
          "flex gap-0",
          "border-b transition-colors",
          error
            ? "border-[#FFB4AB]"
            : "border-[rgba(192,192,192,0.15)] focus-within:border-[rgba(192,192,192,0.4)]"
        )}
      >
        <span
          className="font-mono text-sm text-mercury opacity-50 select-none shrink-0 pt-2"
          aria-hidden="true"
        >
          &gt;_
        </span>

        <textarea
          ref={ref}
          id={textareaId}
          className={cn(
            "w-full bg-transparent font-mono text-sm text-foreground",
            "py-2 pl-2 pr-0 min-h-[80px] resize-y",
            "outline-none border-none",
            "placeholder:text-mercury placeholder:opacity-30",
            "disabled:opacity-40 disabled:cursor-not-allowed"
          )}
          data-testid="terminal-textarea-field"
          {...props}
        />
      </div>

      {error && (
        <p className="mt-1.5 text-[11px] font-mono text-[#FFB4AB]">
          ! {error}
        </p>
      )}
    </div>
  );
});

TerminalTextarea.displayName = "TerminalTextarea";

/* ─── Select variant ─────────────────────────────────────── */

export interface TerminalSelectOption {
  value: string;
  label: string;
}

export interface TerminalSelectProps {
  label?: string;
  error?: string;
  value: string;
  onChange: (value: string) => void;
  options: TerminalSelectOption[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function TerminalSelect({
  label,
  error,
  value,
  onChange,
  options,
  placeholder = "SELECCIONAR...",
  className,
  disabled = false,
}: TerminalSelectProps) {
  const selectId = React.useId();

  return (
    <div className={cn("w-full", className)} data-testid="terminal-select">
      {label && (
        <label
          htmlFor={selectId}
          className="block text-[11px] font-mono uppercase tracking-wider text-mercury mb-2"
          data-testid="terminal-select-label"
        >
          {label}
        </label>
      )}

      <div
        className={cn(
          "flex items-center gap-0",
          "border-b transition-colors",
          error
            ? "border-[#FFB4AB]"
            : "border-[rgba(192,192,192,0.15)] focus-within:border-[rgba(192,192,192,0.4)]"
        )}
      >
        <span
          className="font-mono text-sm text-mercury opacity-50 select-none shrink-0 pb-2"
          aria-hidden="true"
        >
          &gt;_
        </span>

        <select
          id={selectId}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={cn(
            "w-full bg-transparent font-mono text-sm text-foreground",
            "py-2 pl-2 pr-0 appearance-none",
            "outline-none border-none",
            "disabled:opacity-40 disabled:cursor-not-allowed",
            !value && "text-mercury opacity-30"
          )}
          data-testid="terminal-select-field"
        >
          <option value="" className="bg-[#0A0A0A] text-mercury">
            {placeholder}
          </option>
          {options.map((opt) => (
            <option
              key={opt.value}
              value={opt.value}
              className="bg-[#0A0A0A] text-foreground"
            >
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <p className="mt-1.5 text-[11px] font-mono text-[#FFB4AB]">
          ! {error}
        </p>
      )}
    </div>
  );
}
