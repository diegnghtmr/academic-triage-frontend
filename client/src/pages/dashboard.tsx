import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useAuth } from "@/lib/auth";
import { StatCard } from "@/components/cyber/stat-card";
import { DataTable } from "@/components/cyber/data-table";
import { StatusBadge, PriorityBadge } from "@/components/cyber/triage-badge";
import { TerminalLog } from "@/components/cyber/terminal-log";
import type { DashboardMetrics } from "@shared/schema";
import type { RequestStatus, Priority } from "@/components/cyber/triage-badge";

export default function DashboardPage() {
  const { user } = useAuth();

  const { data: metrics } = useQuery<DashboardMetrics>({
    queryKey: ["/api/reports/dashboard"],
  });

  const { data: requestsData } = useQuery<any>({
    queryKey: ["/api/requests"],
  });

  const requests = Array.isArray(requestsData) ? requestsData : (requestsData?.data || requestsData?.content || []);
  const recentRequests = Array.isArray(requests) ? requests.slice(0, 10) : [];
  const inProgress = metrics?.requestsByStatus?.["IN_PROGRESS"] || 0;
  const closed = metrics?.requestsByStatus?.["CLOSED"] || 0;
  const total = metrics?.totalRequests || 0;

  const columns = [
    {
      key: "id",
      header: "ID_REGISTRO",
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
      key: "requestType",
      header: "TIPO_SERVICIO",
      render: (row: any) => (
        <span className="text-mercury">{row.requestType?.name || "SIN CLASIFICAR"}</span>
      ),
    },
    {
      key: "status",
      header: "ESTADO",
      render: (row: any) => <StatusBadge status={row.status as RequestStatus} />,
    },
    {
      key: "priority",
      header: "PRIORIDAD",
      render: (row: any) =>
        row.priority ? (
          <PriorityBadge priority={row.priority as Priority} />
        ) : (
          <span className="font-mono text-xs text-mercury opacity-40">—</span>
        ),
    },
    {
      key: "registrationDateTime",
      header: "FECHA_APERTURA",
      mono: true,
      render: (row: any) => (
        <span className="text-mercury opacity-60">
          {new Date(row.registrationDateTime).toLocaleDateString("es-CO")}
        </span>
      ),
    },
    {
      key: "assignedTo",
      header: "RESPONSABLE",
      render: (row: any) => (
        <span className="text-mercury">
          {row.assignedTo
            ? `${row.assignedTo.firstName} ${row.assignedTo.lastName}`
            : "—"}
        </span>
      ),
    },
  ];

  const systemLogs = [
    {
      id: "sys-1",
      timestamp: new Date().toLocaleTimeString("es-CO"),
      action: "Sistema iniciado",
      message: "Todos los módulos operativos",
    },
    {
      id: "sys-2",
      timestamp: new Date(Date.now() - 60000).toLocaleTimeString("es-CO"),
      action: "Motor IA conectado",
      message: "Clasificador listo",
    },
    {
      id: "sys-3",
      timestamp: new Date(Date.now() - 120000).toLocaleTimeString("es-CO"),
      action: "Base de datos sincronizada",
      message: `${total} registros indexados`,
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1
            className="text-3xl font-bold text-foreground tracking-[-0.02em]"
            style={{ fontFamily: "Inter, sans-serif" }}
          >
            PANEL DE SOLICITUDES
          </h1>
          <div className="font-mono text-xs text-mercury mt-1 space-x-4">
            <span>
              {user?.firstName} {user?.lastName}
            </span>
            <span className="opacity-20">│</span>
            <span>ID: {user?.identification}</span>
            <span className="opacity-20">│</span>
            <span className="uppercase">{user?.role}</span>
          </div>
        </div>
        <Link href="/requests/create">
          <button
            data-testid="new-request-button"
            className="px-4 py-2.5 bg-white text-[#0A0A0A] font-mono text-xs tracking-widest rounded-none hover:bg-[#E0E0E0] transition-colors"
          >
            + NUEVA SOLICITUD
          </button>
        </Link>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="TOTAL SOLICITUDES" value={total} dither="░░░" />
        <StatCard label="EN PROCESO" value={inProgress} dither="▒▒▒" />
        <StatCard label="CERRADAS" value={closed} dither="▓▓▓" />
      </div>

      {/* Data Table */}
      <div>
        <div className="font-mono text-[11px] text-mercury tracking-wider uppercase mb-3">
          SOLICITUDES RECIENTES
        </div>
        <DataTable
          columns={columns}
          data={recentRequests}
          getRowKey={(row: any) => String(row.id)}
        />
      </div>

      {/* Bottom section */}
      <div className="grid grid-cols-2 gap-4">
        {/* Terminal */}
        <TerminalLog
          title="TERMINAL_ESTADO_DEL_SISTEMA"
          entries={systemLogs}
          maxHeight="180px"
        />

        {/* Recommended action */}
        <div className="surface-elevated ghost-border p-5">
          <div className="font-mono text-[11px] text-mercury tracking-wider uppercase mb-3">
            PRÓXIMA ACCIÓN RECOMENDADA
          </div>
          {recentRequests.some((r: any) => r.status === "REGISTERED") ? (
            <div className="space-y-3">
              <div className="font-mono text-sm text-foreground">
                Hay solicitudes pendientes de clasificación
              </div>
              <Link href="/requests">
                <button
                  data-testid="go-to-requests-button"
                  className="px-3 py-1.5 font-mono text-[10px] text-[#0A0A0A] bg-white rounded-none hover:bg-[#E0E0E0] transition-colors tracking-widest"
                >
                  IR A SOLICITUDES
                </button>
              </Link>
            </div>
          ) : (
            <div className="font-mono text-sm text-mercury opacity-40">
              &gt;_ Todas las solicitudes están al día
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
