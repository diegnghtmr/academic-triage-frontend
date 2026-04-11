import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useAuth } from "@/lib/auth";
import { StatCard } from "@/components/cyber/stat-card";
import { DataTable } from "@/components/cyber/data-table";
import { StatusBadge, PriorityBadge } from "@/components/cyber/triage-badge";
import type { RequestStatus, Priority } from "@/components/cyber/triage-badge";

export default function StudentDashboardPage() {
  const { user } = useAuth();

  const { data: requestsData } = useQuery<any>({
    queryKey: ["/api/requests"],
  });

  const myRequests = Array.isArray(requestsData) ? requestsData : (requestsData?.data || requestsData?.content || []);
  const pending = myRequests.filter(
    (r) => r.status !== "CLOSED" && r.status !== "CANCELLED" && r.status !== "REJECTED"
  ).length;
  const resolved = myRequests.filter((r) => r.status === "CLOSED").length;

  const columns = [
    {
      key: "id",
      header: "ID_REGISTRO",
      mono: true,
      render: (row: any) => (
        <Link href={`/requests/${row.id}`}>
          <span className="text-foreground hover:underline cursor-pointer font-mono">
            UQ-{String(row.id).padStart(4, "0")}
          </span>
        </Link>
      ),
    },
    {
      key: "description",
      header: "ASUNTO",
      render: (row: any) => (
        <span className="text-mercury truncate block max-w-[300px]">
          {row.description.substring(0, 60)}
          {row.description.length > 60 ? "..." : ""}
        </span>
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
      header: "FECHA",
      mono: true,
      render: (row: any) => (
        <span className="text-mercury opacity-60 font-mono">
          {new Date(row.registrationDateTime).toLocaleDateString("es-CO")}
        </span>
      ),
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1
            className="text-3xl font-bold text-foreground tracking-[-0.02em]"
            style={{ fontFamily: "Inter, sans-serif" }}
          >
            MIS SOLICITUDES
          </h1>
          <div className="font-mono text-xs text-mercury mt-1">
            {user?.firstName} {user?.lastName} — {user?.identification}
          </div>
        </div>
        <Link href="/requests/create">
          <button
            data-testid="student-new-request-button"
            className="px-4 py-2.5 bg-white text-[#0A0A0A] font-mono text-xs tracking-widest rounded-none hover:bg-[#E0E0E0] transition-colors"
          >
            + NUEVA SOLICITUD
          </button>
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatCard label="TOTAL" value={myRequests.length} />
        <StatCard label="PENDIENTES" value={pending} dither="▒▒▒" />
        <StatCard label="RESUELTAS" value={resolved} dither="▓▓▓" />
      </div>

      <DataTable
        columns={columns}
        data={myRequests}
        getRowKey={(row: any) => String(row.id)}
      />
    </div>
  );
}
