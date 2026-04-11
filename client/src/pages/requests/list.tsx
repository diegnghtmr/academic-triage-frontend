import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useAuth } from "@/lib/auth";
import { DataTable } from "@/components/cyber/data-table";
import { StatusBadge } from "@/components/cyber/triage-badge";
import { TerminalSelect } from "@/components/cyber/terminal-input";
import { TerminalLog } from "@/components/cyber/terminal-log";
import type { RequestStatus } from "@/components/cyber/triage-badge";

export default function RequestListPage() {
  const { isStudent } = useAuth();
  const [filters, setFilters] = useState({
    type: "",
    status: "",
    priority: "",
  });
  const [appliedFilters, setAppliedFilters] = useState(filters);

  const { data: requestsData, isLoading } = useQuery<any>({
    queryKey: ["/api/requests"],
  });

  const { data: requestTypes } = useQuery<any[]>({
    queryKey: ["/api/catalogs/request-types"],
  });

  const allRequests = Array.isArray(requestsData) ? requestsData : (requestsData?.data || requestsData?.content || []);

  const filteredRequests = allRequests.filter((r) => {
    if (appliedFilters.status && r.status !== appliedFilters.status) return false;
    if (appliedFilters.priority && r.priority !== appliedFilters.priority) return false;
    if (appliedFilters.type && String(r.requestTypeId) !== appliedFilters.type) return false;
    return true;
  });

  const classified = allRequests.filter((r) => r.status !== "REGISTERED").length;
  const waiting = allRequests.filter(
    (r) => r.status === "REGISTERED" || r.status === "CLASSIFIED"
  ).length;
  const resolved = allRequests.filter(
    (r) => r.status === "CLOSED" || r.status === "ATTENDED"
  ).length;

  const columns = [
    {
      key: "id",
      header: "ID",
      mono: true,
      render: (row: any) => (
        <Link href={`/requests/${row.id}`}>
          <span className="text-foreground hover:underline cursor-pointer">
            UQ-{String(row.id).padStart(4, "0")}
          </span>
        </Link>
      ),
    },
    {
      key: "requester",
      header: "ESTUDIANTE/PROGRAMA",
      render: (row: any) => (
        <div>
          <div className="text-foreground text-sm">
            {row.requester
              ? `${row.requester.firstName} ${row.requester.lastName}`
              : "—"}
          </div>
          <div className="text-[9px] text-mercury opacity-40 font-mono">
            {row.requester?.identification || ""}
          </div>
        </div>
      ),
    },
    {
      key: "description",
      header: "ASUNTO",
      render: (row: any) => (
        <span className="text-mercury truncate block max-w-[250px] text-sm">
          {row.description.substring(0, 50)}
          {row.description.length > 50 ? "..." : ""}
        </span>
      ),
    },
    {
      key: "status",
      header: "ESTADO",
      render: (row: any) => <StatusBadge status={row.status as RequestStatus} />,
    },
    {
      key: "actions",
      header: "ACCIONES",
      render: (row: any) => (
        <div className="flex gap-2">
          {row.status === "REGISTERED" && !isStudent() && (
            <Link href={`/requests/${row.id}`}>
              <button
                data-testid={`classify-${row.id}`}
                className="px-2 py-1 font-mono text-[9px] text-foreground ghost-border hover:bg-[#2A2A2A] transition-colors tracking-widest"
              >
                CLASIFICAR
              </button>
            </Link>
          )}
          {row.status === "CLASSIFIED" && !isStudent() && (
            <Link href={`/requests/${row.id}`}>
              <button
                data-testid={`prioritize-${row.id}`}
                className="px-2 py-1 font-mono text-[9px] text-foreground ghost-border hover:bg-[#2A2A2A] transition-colors tracking-widest"
              >
                PRIORIZAR
              </button>
            </Link>
          )}
          {(row.status === "CLASSIFIED" || row.status === "IN_PROGRESS") && !isStudent() && (
            <Link href={`/requests/${row.id}`}>
              <button
                data-testid={`assign-${row.id}`}
                className="px-2 py-1 font-mono text-[9px] text-foreground ghost-border hover:bg-[#2A2A2A] transition-colors tracking-widest"
              >
                ASIGNAR
              </button>
            </Link>
          )}
          <Link href={`/requests/${row.id}`}>
            <button
              data-testid={`view-${row.id}`}
              className="px-2 py-1 font-mono text-[9px] text-mercury ghost-border hover:bg-[#1C1B1B] transition-colors tracking-widest"
            >
              VER
            </button>
          </Link>
        </div>
      ),
    },
  ];

  const recentLogs = allRequests
    .slice(0, 5)
    .map((r: any, i: number) => ({
      id: `log-${r.id}-${i}`,
      timestamp: new Date(r.registrationDateTime).toLocaleTimeString("es-CO"),
      action: `Solicitud UQ-${String(r.id).padStart(4, "0")}`,
      message: r.status,
    }));

  return (
    <div className="p-6 space-y-6">
      {/* Banner */}
      <div className="surface-elevated ghost-border p-5">
        <h1
          className="text-2xl font-bold text-foreground tracking-[-0.02em]"
          style={{ fontFamily: "Inter, sans-serif" }}
        >
          SOLICITUDES PENDIENTES DE ATENCIÓN
        </h1>
        <div className="font-mono text-xs text-mercury mt-1">
          {filteredRequests.length} CRITICAL PATH ELEMENTS
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {/* Filter bar - 3 cols */}
        <div className="col-span-3 space-y-4">
          <div className="surface-elevated ghost-border p-4">
            <div className="grid grid-cols-4 gap-3">
              <TerminalSelect
                label="TIPO"
                value={filters.type}
                onChange={(v) => setFilters((p) => ({ ...p, type: v }))}
                options={
                  (requestTypes || []).map((t: any) => ({
                    value: String(t.id),
                    label: t.name,
                  }))
                }
                placeholder="TODOS"
              />
              <TerminalSelect
                label="ESTADO"
                value={filters.status}
                onChange={(v) => setFilters((p) => ({ ...p, status: v }))}
                options={[
                  { value: "REGISTERED", label: "REGISTRADA" },
                  { value: "CLASSIFIED", label: "CLASIFICADA" },
                  { value: "IN_PROGRESS", label: "EN TRÁMITE" },
                  { value: "ATTENDED", label: "ATENDIDA" },
                  { value: "CLOSED", label: "FINALIZADA" },
                  { value: "CANCELLED", label: "CANCELADA" },
                  { value: "REJECTED", label: "RECHAZADA" },
                ]}
                placeholder="TODOS"
              />
              <TerminalSelect
                label="PRIORIDAD"
                value={filters.priority}
                onChange={(v) => setFilters((p) => ({ ...p, priority: v }))}
                options={[
                  { value: "HIGH", label: "ALTA" },
                  { value: "MEDIUM", label: "ESTÁNDAR" },
                  { value: "LOW", label: "BAJA" },
                ]}
                placeholder="TODAS"
              />
              <div className="flex items-end">
                <button
                  data-testid="execute-filter-button"
                  onClick={() => setAppliedFilters(filters)}
                  className="w-full py-2.5 bg-white text-[#0A0A0A] font-mono text-[10px] tracking-widest rounded-none hover:bg-[#E0E0E0] transition-colors"
                >
                  EJECUTAR_FILTRO
                </button>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="font-mono text-xs text-mercury opacity-40 py-8 text-center">
              &gt;_ CARGANDO REGISTROS...
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={filteredRequests}
              getRowKey={(row: any) => String(row.id)}
            />
          )}
        </div>

        {/* Right panel */}
        <div className="space-y-4">
          {/* System load */}
          <div className="surface-elevated ghost-border p-4">
            <div className="font-mono text-[11px] text-mercury tracking-wider uppercase mb-4">
              CARGA_SISTEMA
            </div>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="font-mono text-[9px] text-mercury">CLASIFICADAS</span>
                  <span className="font-mono text-[9px] text-mercury opacity-40">
                    {classified}/{allRequests.length}
                  </span>
                </div>
                <div className="h-1.5 bg-[#2A2A2A]">
                  <div
                    className="h-full bg-foreground"
                    style={{
                      width: `${allRequests.length > 0 ? (classified / allRequests.length) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="font-mono text-[9px] text-mercury">EN ESPERA</span>
                  <span className="font-mono text-[9px] text-mercury opacity-40">
                    {waiting}/{allRequests.length}
                  </span>
                </div>
                <div className="h-1.5 bg-[#2A2A2A]">
                  <div
                    className="h-full bg-mercury"
                    style={{
                      width: `${allRequests.length > 0 ? (waiting / allRequests.length) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="font-mono text-[9px] text-mercury">RESUELTAS</span>
                  <span className="font-mono text-[9px] text-mercury opacity-40">
                    {resolved}/{allRequests.length}
                  </span>
                </div>
                <div className="h-1.5 bg-[#2A2A2A]">
                  <div
                    className="h-full bg-mercury opacity-50"
                    style={{
                      width: `${allRequests.length > 0 ? (resolved / allRequests.length) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* History Log */}
          <TerminalLog title="HISTORIAL_LOG" entries={recentLogs} maxHeight="200px" />
        </div>
      </div>
    </div>
  );
}
