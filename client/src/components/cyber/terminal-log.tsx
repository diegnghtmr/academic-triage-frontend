import * as React from "react";
import { cn } from "@/lib/utils";

export interface TerminalLogEntry {
  id?: string;
  timestamp: string;
  action: string;
  actor?: string;
  origin?: string;
  message?: string;
  /** Backward compat: some code passes "detail" instead of "message" */
  detail?: string;
}

export interface TerminalLogProps {
  entries: TerminalLogEntry[];
  title?: string;
  maxHeight?: string;
  showCursor?: boolean;
  className?: string;
}

export function TerminalLog({
  entries,
  title = "REGISTRO DE ACTIVIDAD",
  maxHeight = "320px",
  showCursor = true,
  className,
}: TerminalLogProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries]);

  return (
    <div
      data-testid="terminal-log"
      className={cn(
        "surface-elevated ghost-border font-mono text-sm",
        className
      )}
    >
      {/* Header */}
      <div className="ghost-border-b px-4 py-2 flex items-center justify-between">
        <span
          className="text-xs text-mercury tracking-architectural uppercase"
          data-testid="terminal-log-title"
        >
          {title}
        </span>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-mercury opacity-40">
            {entries.length} REGISTROS
          </span>
        </div>
      </div>

      {/* Log body */}
      <div
        ref={scrollRef}
        className="p-4 overflow-y-auto"
        style={{ maxHeight }}
        data-testid="terminal-log-body"
      >
        {entries.length === 0 ? (
          <div className="text-mercury opacity-40 text-xs">
            <span className="terminal-prompt" />
            ESPERANDO REGISTROS...
          </div>
        ) : (
          <div className="space-y-1">
            {entries.map((entry, index) => {
              const entryKey = entry.id || String(index);
              const entryMessage = entry.message || entry.detail;

              return (
                <div
                  key={entryKey}
                  className="text-xs leading-relaxed group hover:bg-[#1C1B1B] px-1 -mx-1 transition-colors"
                  data-testid={`terminal-log-entry-${entryKey}`}
                >
                  <span className="text-mercury opacity-60">
                    [{entry.timestamp}]
                  </span>{" "}
                  <span className="text-foreground font-medium">
                    {entry.action.toUpperCase()}
                  </span>
                  {entry.actor && (
                    <>
                      {" "}
                      <span className="text-mercury opacity-50">por actor</span>{" "}
                      <span className="text-foreground">'{entry.actor}'</span>
                    </>
                  )}
                  {entry.origin && (
                    <>
                      {" "}
                      <span className="text-mercury opacity-40">|</span>{" "}
                      <span className="text-mercury opacity-60">ORIGEN:</span>{" "}
                      <span className="text-foreground">{entry.origin}</span>
                    </>
                  )}
                  {entryMessage && (
                    <>
                      {" "}
                      <span className="text-mercury opacity-40">|</span>{" "}
                      <span className="text-mercury">{entryMessage}</span>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Blinking cursor */}
        {showCursor && (
          <div className="mt-2 text-xs flex items-center">
            <span className="text-mercury opacity-50">&gt;_</span>
            <span className="ml-1 text-mercury animate-blink-cursor">█</span>
          </div>
        )}
      </div>
    </div>
  );
}
