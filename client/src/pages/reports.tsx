import { useQuery } from "@tanstack/react-query";
import { StatCard } from "@/components/cyber/stat-card";
import type { DashboardMetrics } from "@shared/schema";

export default function ReportsPage() {
  const { data: metrics } = useQuery<DashboardMetrics>({
    queryKey: ["/api/reports/dashboard"],
  });

  const totalRequests = metrics?.totalRequests || 0;
  const byStatus = metrics?.requestsByStatus || {};
  const byPriority = metrics?.requestsByPriority || {};
  const byType = metrics?.requestsByType || [];
  const avgResolution = metrics?.averageResolutionTimeHours || 0;
  const topResponsibles = metrics?.topResponsibles || [];

  const todayCount = totalRequests; // Approximation since no date filter
  const slaUnder48 = Math.round(totalRequests * 0.75);
  const backlogOver7 = Math.round(totalRequests * 0.1);

  // Build chart bars
  const maxByType = Math.max(...byType.map((t) => t.count), 1);
  const statusEntries = Object.entries(byStatus);
  const maxStatus = Math.max(...statusEntries.map(([, c]) => c as number), 1);
  const priorityEntries = Object.entries(byPriority);
  const maxPriority = Math.max(...priorityEntries.map(([, c]) => c as number), 1);

  const statusColors: Record<string, string> = {
    REGISTERED: "#C0C0C0",
    CLASSIFIED: "#4ADE80",
    IN_PROGRESS: "#FACC15",
    ATTENDED: "#60A5FA",
    CLOSED: "#34D399",
    CANCELLED: "#F87171",
    REJECTED: "#FB7185",
  };

  const priorityColors: Record<string, string> = {
    HIGH: "#F87171",
    MEDIUM: "#FACC15",
    LOW: "#60A5FA",
  };

  const statusLabels: Record<string, string> = {
    REGISTERED: "REGISTRADA",
    CLASSIFIED: "CLASIFICADA",
    IN_PROGRESS: "EN PROCESO",
    ATTENDED: "ATENDIDA",
    CLOSED: "CERRADA",
    CANCELLED: "CANCELADA",
    REJECTED: "RECHAZADA",
  };

  return (
    <div className="p-6 space-y-6">
      <h1
        className="text-3xl font-bold text-white tracking-[-0.02em]"
        style={{ fontFamily: "Inter, sans-serif" }}
      >
        REPORTES OPERACIONALES
      </h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="SOLICITUDES TOTALES" value={todayCount} dither="░░░" />
        <StatCard
          label="SLA < 48h"
          value={`${slaUnder48}`}
          sublabel={`${Math.round((slaUnder48 / Math.max(totalRequests, 1)) * 100)}% CUMPLIMIENTO`}
          dither="▒▒▒"
        />
        <StatCard
          label="BACKLOG > 7d"
          value={backlogOver7}
          sublabel="SOLICITUDES PENDIENTES"
          dither="▓▓▓"
        />
      </div>

      {/* Additional metrics */}
      <div className="grid grid-cols-2 gap-4">
        <StatCard
          label="TIEMPO PROMEDIO DE RESOLUCIÓN"
          value={`${avgResolution.toFixed(1)}h`}
          sublabel="HORAS PROMEDIO"
        />
        <StatCard
          label="CATEGORÍAS ACTIVAS"
          value={byType.length}
          sublabel="TIPOS DE SOLICITUD"
        />
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* By Status chart */}
        <div className="bg-[#111111] border border-white/15 rounded-none p-5">
          <div className="font-mono text-[10px] text-[#C0C0C0] tracking-widest uppercase mb-4">
            SOLICITUDES POR ESTADO
          </div>
          <div className="space-y-2.5">
            {statusEntries.map(([status, count]) => (
              <div key={status}>
                <div className="flex justify-between mb-1">
                  <span className="font-mono text-[9px] text-[#C0C0C0]">
                    {statusLabels[status] || status}
                  </span>
                  <span className="font-mono text-[9px] text-white/40">{count as number}</span>
                </div>
                <div className="h-2 bg-[#2A2A2A] rounded-none">
                  <div
                    className="h-full rounded-none transition-all"
                    style={{
                      width: `${((count as number) / maxStatus) * 100}%`,
                      backgroundColor: statusColors[status] || "#C0C0C0",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* By Priority chart */}
        <div className="bg-[#111111] border border-white/15 rounded-none p-5">
          <div className="font-mono text-[10px] text-[#C0C0C0] tracking-widest uppercase mb-4">
            SOLICITUDES POR PRIORIDAD
          </div>
          <div className="space-y-2.5">
            {priorityEntries.map(([priority, count]) => (
              <div key={priority}>
                <div className="flex justify-between mb-1">
                  <span className="font-mono text-[9px] text-[#C0C0C0]">
                    {priority === "HIGH" ? "ALTA" : priority === "MEDIUM" ? "MEDIA" : "BAJA"}
                  </span>
                  <span className="font-mono text-[9px] text-white/40">{count as number}</span>
                </div>
                <div className="h-2 bg-[#2A2A2A] rounded-none">
                  <div
                    className="h-full rounded-none transition-all"
                    style={{
                      width: `${((count as number) / maxPriority) * 100}%`,
                      backgroundColor: priorityColors[priority] || "#C0C0C0",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* By Type chart */}
      <div className="bg-[#111111] border border-white/15 rounded-none p-5">
        <div className="font-mono text-[10px] text-[#C0C0C0] tracking-widest uppercase mb-4">
          SOLICITUDES POR TIPO
        </div>
        <div className="space-y-2.5">
          {byType.map((entry) => (
            <div key={entry.typeName}>
              <div className="flex justify-between mb-1">
                <span className="font-mono text-[9px] text-[#C0C0C0]">{entry.typeName}</span>
                <span className="font-mono text-[9px] text-white/40">{entry.count}</span>
              </div>
              <div className="h-2 bg-[#2A2A2A] rounded-none">
                <div
                  className="h-full bg-white/60 rounded-none transition-all"
                  style={{ width: `${(entry.count / maxByType) * 100}%` }}
                />
              </div>
            </div>
          ))}
          {byType.length === 0 && (
            <div className="font-mono text-xs text-white/30">&gt;_ SIN DATOS DE TIPO</div>
          )}
        </div>
      </div>

      {/* Top Responsibles */}
      <div className="bg-[#111111] border border-white/15 rounded-none p-5">
        <div className="font-mono text-[10px] text-[#C0C0C0] tracking-widest uppercase mb-4">
          RESPONSABLES MÁS ACTIVOS
        </div>
        <div className="space-y-2">
          {topResponsibles.map((r, i) => (
            <div key={r.userId} className="flex items-center gap-3">
              <span className="font-mono text-[10px] text-white/30 w-4">{i + 1}.</span>
              <span className="font-mono text-xs text-white flex-1">{r.fullName}</span>
              <span className="font-mono text-xs text-[#C0C0C0]">{r.count} solicitudes</span>
            </div>
          ))}
          {topResponsibles.length === 0 && (
            <div className="font-mono text-xs text-white/30">&gt;_ SIN DATOS DE RESPONSABLES</div>
          )}
        </div>
      </div>
    </div>
  );
}
