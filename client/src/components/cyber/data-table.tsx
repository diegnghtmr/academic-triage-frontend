import * as React from "react";
import { cn } from "@/lib/utils";

export interface DataTableColumn<T> {
  key: string;
  header: string;
  /** If true, renders in JetBrains Mono */
  mono?: boolean;
  /** Custom render function */
  render?: (row: T, index: number) => React.ReactNode;
  /** Column width class e.g. "w-24" */
  width?: string;
  /** Align: left (default), center, right */
  align?: "left" | "center" | "right";
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  /** Unique key extractor for each row. Defaults to index. */
  getRowKey?: (row: T, index: number) => string;
  /** Optional: row click handler */
  onRowClick?: (row: T, index: number) => void;
  /** Optional: empty state message */
  emptyMessage?: string;
  className?: string;
}

function defaultGetRowKey<T>(_row: T, index: number): string {
  return String(index);
}

export function DataTable<T>({
  columns,
  data,
  getRowKey = defaultGetRowKey,
  onRowClick,
  emptyMessage = "SIN REGISTROS",
  className,
}: DataTableProps<T>) {
  return (
    <div
      data-testid="data-table"
      className={cn("w-full overflow-x-auto", className)}
    >
      <table className="w-full border-collapse">
        {/* Header */}
        <thead>
          <tr className="surface-elevated ghost-border-b">
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  "px-4 py-3 text-[11px] font-mono font-semibold uppercase tracking-wider text-mercury text-left",
                  col.width,
                  col.align === "center" && "text-center",
                  col.align === "right" && "text-right"
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>

        {/* Body */}
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-8 text-center font-mono text-xs text-mercury opacity-40"
                data-testid="data-table-empty"
              >
                <span className="terminal-prompt" />
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, rowIndex) => (
              <tr
                key={getRowKey(row, rowIndex)}
                data-testid={`data-table-row-${getRowKey(row, rowIndex)}`}
                className={cn(
                  "ghost-border-b transition-colors",
                  onRowClick
                    ? "cursor-pointer hover:bg-[#3A3939]"
                    : "hover:bg-[#1C1B1B]"
                )}
                onClick={() => onRowClick?.(row, rowIndex)}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      "px-4 py-3 text-sm",
                      col.mono && "font-mono text-xs",
                      col.align === "center" && "text-center",
                      col.align === "right" && "text-right",
                      col.width
                    )}
                  >
                    {col.render
                      ? col.render(row, rowIndex)
                      : (row as Record<string, unknown>)[col.key] as React.ReactNode}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
