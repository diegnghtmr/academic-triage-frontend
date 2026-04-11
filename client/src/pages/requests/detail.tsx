import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { useAuth } from "@/lib/auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { StatusBadge, PriorityBadge } from "@/components/cyber/triage-badge";
import { LifecycleTracker } from "@/components/cyber/lifecycle-tracker";
import { TerminalLog } from "@/components/cyber/terminal-log";
import { TerminalInput, TerminalTextarea, TerminalSelect } from "@/components/cyber/terminal-input";
import { ConfirmDialog } from "@/components/cyber/confirm-dialog";
import type { RequestStatus, Priority } from "@/components/cyber/triage-badge";

export default function RequestDetailPage() {
  const [, params] = useRoute("/requests/:id");
  const requestId = params?.id;
  const { isStudent, isAdmin, isStaff } = useAuth();

  // Form states for actions
  const [classifyTypeId, setClassifyTypeId] = useState("");
  const [classifyObs, setClassifyObs] = useState("");
  const [priorityValue, setPriorityValue] = useState("");
  const [priorityJust, setPriorityJust] = useState("");
  const [assignUserId, setAssignUserId] = useState("");
  const [assignObs, setAssignObs] = useState("");
  const [closeObs, setCloseObs] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [attendObs, setAttendObs] = useState("");
  const [noteText, setNoteText] = useState("");

  const { data: request, isLoading } = useQuery<any>({
    queryKey: [`/api/requests/${requestId}`],
    enabled: !!requestId,
  });

  const { data: history } = useQuery<any[]>({
    queryKey: [`/api/requests/${requestId}/history`],
    enabled: !!requestId,
  });

  const { data: aiSummary } = useQuery<any>({
    queryKey: [`/api/ai/summarize/${requestId}`],
    enabled: !!requestId && !isStudent(),
  });

  const { data: prioritySuggestion } = useQuery<any>({
    queryKey: [`/api/requests/${requestId}/priority-suggestion`],
    enabled: !!requestId && !isStudent(),
  });

  const { data: requestTypes } = useQuery<any[]>({
    queryKey: ["/api/catalogs/request-types"],
    enabled: !isStudent(),
  });

  const { data: staffUsersData } = useQuery<any>({
    queryKey: ["/api/users"],
    enabled: isAdmin() || isStaff(),
  });
  const staffUsers = Array.isArray(staffUsersData) ? staffUsersData : (staffUsersData?.data || []);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: [`/api/requests/${requestId}`] });
    queryClient.invalidateQueries({ queryKey: [`/api/requests/${requestId}/history`] });
    queryClient.invalidateQueries({ queryKey: ["/api/requests"] });
  };

  const classifyMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PATCH", `/api/requests/${requestId}/classify`, {
        requestTypeId: Number(classifyTypeId),
        observations: classifyObs || undefined,
      });
    },
    onSuccess: invalidate,
  });

  const prioritizeMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PATCH", `/api/requests/${requestId}/prioritize`, {
        priority: priorityValue,
        priorityJustification: priorityJust || undefined,
      });
    },
    onSuccess: invalidate,
  });

  const assignMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PATCH", `/api/requests/${requestId}/assign`, {
        assignedToUserId: Number(assignUserId),
        observations: assignObs || undefined,
      });
    },
    onSuccess: invalidate,
  });

  const attendMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PATCH", `/api/requests/${requestId}/attend`, {
        observations: attendObs || undefined,
      });
    },
    onSuccess: invalidate,
  });

  const closeMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PATCH", `/api/requests/${requestId}/close`, {
        closingObservation: closeObs,
      });
    },
    onSuccess: invalidate,
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PATCH", `/api/requests/${requestId}/cancel`, {
        cancellationReason: cancelReason,
      });
    },
    onSuccess: invalidate,
  });

  const rejectMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PATCH", `/api/requests/${requestId}/reject`, {
        rejectionReason: rejectReason,
      });
    },
    onSuccess: invalidate,
  });

  const addNoteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/requests/${requestId}/history`, {
        observations: noteText,
      });
    },
    onSuccess: () => {
      invalidate();
      setNoteText("");
    },
  });

  const aiClassifyMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/ai/suggest-classification", {
        description: request?.description || "",
      });
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="font-mono text-xs text-mercury opacity-40">&gt;_ CARGANDO SOLICITUD...</div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="p-6">
        <div className="font-mono text-xs text-[#FFB4AB]">&gt;_ ERROR: SOLICITUD NO ENCONTRADA</div>
      </div>
    );
  }

  const historyEntries = (history || []).map((h: any, i: number) => ({
    id: `hist-${h.id || i}`,
    timestamp: new Date(h.timestamp).toLocaleString("es-CO"),
    action: h.action,
    message: h.observations || undefined,
  }));

  const canManage = isAdmin() || isStaff();
  const status = request.status;
  const isTerminated = status === "CANCELLED" || status === "REJECTED";

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1
              className="text-2xl font-bold text-foreground tracking-[-0.02em]"
              style={{ fontFamily: "Inter, sans-serif" }}
            >
              SOLICITUD #UQ-{String(request.id).padStart(4, "0")}
            </h1>
            <StatusBadge status={status as RequestStatus} />
          </div>
          <div className="font-mono text-xs text-mercury mt-1">
            REGISTRADA: {new Date(request.registrationDateTime).toLocaleString("es-CO")}
          </div>
        </div>
        <Link href="/requests">
          <span className="font-mono text-xs text-mercury hover:text-foreground cursor-pointer">
            &lt; VOLVER A LISTA
          </span>
        </Link>
      </div>

      {/* Lifecycle */}
      <div className="surface-elevated ghost-border p-4">
        <LifecycleTracker currentStep={status} terminated={isTerminated} />
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Main content - 2 cols */}
        <div className="col-span-2 space-y-4">
          {/* Type & Origin */}
          <div className="grid grid-cols-2 gap-4">
            <div className="surface-elevated ghost-border p-4">
              <div className="font-mono text-[11px] text-mercury tracking-wider uppercase mb-1">
                TIPO DE SOLICITUD
              </div>
              <div className="font-mono text-sm text-foreground">
                {request.requestType?.name || "SIN CLASIFICAR"}
              </div>
            </div>
            <div className="surface-elevated ghost-border p-4">
              <div className="font-mono text-[11px] text-mercury tracking-wider uppercase mb-1">
                ORIGEN DEL DATO
              </div>
              <div className="font-mono text-sm text-foreground">
                {request.originChannel?.name || "NO ESPECIFICADO"}
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="surface-elevated ghost-border p-4">
            <div className="font-mono text-[11px] text-mercury tracking-wider uppercase mb-2">
              DESCRIPCIÓN DETALLADA
            </div>
            <div className="font-mono text-sm text-foreground whitespace-pre-wrap leading-relaxed">
              {request.description}
            </div>
          </div>

          {/* Priority justification */}
          {request.priorityJustification && (
            <div className="surface-elevated ghost-border p-4">
              <div className="font-mono text-[11px] text-mercury tracking-wider uppercase mb-2">
                JUSTIFICACIÓN DE PRIORIDAD
              </div>
              <div className="font-mono text-sm text-foreground">
                {request.priorityJustification}
              </div>
            </div>
          )}

          {/* Closing/Cancellation/Rejection info */}
          {request.closingObservation && (
            <div className="surface-elevated ghost-border p-4 border-l-2 border-l-foreground">
              <div className="font-mono text-[11px] text-mercury tracking-wider uppercase mb-2">
                OBSERVACIÓN DE CIERRE
              </div>
              <div className="font-mono text-sm text-foreground">{request.closingObservation}</div>
            </div>
          )}
          {request.cancellationReason && (
            <div className="surface-elevated ghost-border p-4 border-l-2 border-l-[#FFB4AB]">
              <div className="font-mono text-[11px] text-[#FFB4AB] tracking-wider uppercase mb-2">
                RAZÓN DE CANCELACIÓN
              </div>
              <div className="font-mono text-sm text-foreground">{request.cancellationReason}</div>
            </div>
          )}
          {request.rejectionReason && (
            <div className="surface-elevated ghost-border p-4 border-l-2 border-l-[#FFB4AB]">
              <div className="font-mono text-[11px] text-[#FFB4AB] tracking-wider uppercase mb-2">
                RAZÓN DE RECHAZO
              </div>
              <div className="font-mono text-sm text-foreground">{request.rejectionReason}</div>
            </div>
          )}

          {/* AI Suggestion */}
          {canManage && (aiSummary || aiClassifyMutation.data || prioritySuggestion) && (
            <div className="bg-[#0A0A0A] ghost-border p-4">
              <div className="font-mono text-[11px] text-mercury tracking-wider uppercase mb-3 flex items-center gap-2">
                <span className="text-foreground">◈</span> SUGERENCIA IA
              </div>
              {aiSummary?.summary && (
                <div className="font-mono text-xs text-foreground mb-3">{aiSummary.summary}</div>
              )}
              {aiClassifyMutation.data && (
                <div className="font-mono text-xs text-mercury mb-3">
                  Clasificación sugerida: {(aiClassifyMutation.data as any).suggestedRequestTypeName || "N/A"}
                  {(aiClassifyMutation.data as any).confidence && ` (Confianza: ${Math.round((aiClassifyMutation.data as any).confidence * 100)}%)`}
                  {(aiClassifyMutation.data as any).reasoning && (
                    <div className="mt-1 opacity-60">{(aiClassifyMutation.data as any).reasoning}</div>
                  )}
                </div>
              )}
              {prioritySuggestion?.priority && (
                <div className="font-mono text-xs text-mercury mb-3">
                  Prioridad sugerida: {prioritySuggestion.priority}
                  {prioritySuggestion.justification && ` — ${prioritySuggestion.justification}`}
                </div>
              )}
              <div className="flex gap-2">
                {status === "REGISTERED" && (aiClassifyMutation.data as any)?.suggestedRequestTypeId && (
                  <button
                    data-testid="apply-ai-suggestion"
                    onClick={() => {
                      setClassifyTypeId(String((aiClassifyMutation.data as any).suggestedRequestTypeId));
                      classifyMutation.mutate();
                    }}
                    className="px-3 py-1.5 font-mono text-[10px] text-[#0A0A0A] bg-white rounded-none hover:bg-[#E0E0E0] transition-colors tracking-widest"
                  >
                    APLICAR SUGERENCIA
                  </button>
                )}
                <button
                  data-testid="ignore-ai-suggestion"
                  className="px-3 py-1.5 font-mono text-[10px] text-mercury ghost-border hover:bg-[#1C1B1B] transition-colors tracking-widest"
                >
                  IGNORAR
                </button>
              </div>
            </div>
          )}

          {/* Request AI classification */}
          {canManage && status === "REGISTERED" && !aiClassifyMutation.data && (
            <button
              data-testid="request-ai-classification"
              onClick={() => aiClassifyMutation.mutate()}
              disabled={aiClassifyMutation.isPending}
              className="font-mono text-[10px] text-foreground ghost-border px-3 py-1.5 hover:bg-[#1C1B1B] transition-colors tracking-widest"
            >
              {aiClassifyMutation.isPending ? "ANALIZANDO..." : "◈ SOLICITAR CLASIFICACIÓN IA"}
            </button>
          )}

          {/* History */}
          <TerminalLog
            title="TERMINAL_LOG :: HISTORIAL"
            entries={historyEntries}
            maxHeight="300px"
          />

          {/* Action buttons */}
          {canManage && (
            <div className="flex gap-3 flex-wrap pt-2">
              {status === "REGISTERED" && (
                <ConfirmDialog
                  trigger={
                    <button data-testid="classify-button" className="px-4 py-2 font-mono text-xs text-[#0A0A0A] bg-white rounded-none hover:bg-[#E0E0E0] transition-colors tracking-widest">
                      CLASIFICAR
                    </button>
                  }
                  title="CLASIFICAR SOLICITUD"
                  description={`Seleccione el tipo de solicitud para UQ-${String(request.id).padStart(4, "0")}. Tipo: ${classifyTypeId ? (requestTypes || []).find((t: any) => String(t.id) === classifyTypeId)?.name || classifyTypeId : "sin seleccionar"}`}
                  confirmLabel="CLASIFICAR"
                  onConfirm={() => classifyMutation.mutate()}
                />
              )}
              {(status === "REGISTERED" || status === "CLASSIFIED") && (
                <ConfirmDialog
                  trigger={
                    <button data-testid="prioritize-button" className="px-4 py-2 font-mono text-xs text-foreground ghost-border hover:bg-[#1C1B1B] transition-colors tracking-widest">
                      PRIORIZAR
                    </button>
                  }
                  title="PRIORIZAR SOLICITUD"
                  description={`Establecer prioridad ${priorityValue || "pendiente de selección"} para UQ-${String(request.id).padStart(4, "0")}.`}
                  confirmLabel="ESTABLECER PRIORIDAD"
                  onConfirm={() => prioritizeMutation.mutate()}
                />
              )}
              {(status === "CLASSIFIED" || status === "IN_PROGRESS") && (
                <ConfirmDialog
                  trigger={
                    <button data-testid="assign-button" className="px-4 py-2 font-mono text-xs text-foreground ghost-border hover:bg-[#1C1B1B] transition-colors tracking-widest">
                      ASIGNAR
                    </button>
                  }
                  title="ASIGNAR RESPONSABLE"
                  description={`Asignar responsable para la solicitud UQ-${String(request.id).padStart(4, "0")}.`}
                  confirmLabel="ASIGNAR"
                  onConfirm={() => assignMutation.mutate()}
                />
              )}
              {status === "IN_PROGRESS" && (
                <ConfirmDialog
                  trigger={
                    <button data-testid="attend-button" className="px-4 py-2 font-mono text-xs text-foreground ghost-border hover:bg-[#1C1B1B] transition-colors tracking-widest">
                      ATENDER
                    </button>
                  }
                  title="ATENDER SOLICITUD"
                  description="Marcar esta solicitud como atendida."
                  confirmLabel="MARCAR COMO ATENDIDA"
                  onConfirm={() => attendMutation.mutate()}
                />
              )}
              {(status === "ATTENDED" || status === "IN_PROGRESS") && (
                <ConfirmDialog
                  trigger={
                    <button data-testid="close-button" className="px-4 py-2 font-mono text-xs text-[#0A0A0A] bg-white rounded-none hover:bg-[#E0E0E0] transition-colors tracking-widest">
                      APROBAR SOLICITUD
                    </button>
                  }
                  title="CERRAR SOLICITUD"
                  description={closeObs ? `Observación: ${closeObs}` : "Ingrese una observación de cierre antes de confirmar."}
                  confirmLabel="CERRAR"
                  onConfirm={() => closeMutation.mutate()}
                />
              )}
              {!isTerminated && status !== "CLOSED" && (
                <>
                  <ConfirmDialog
                    trigger={
                      <button data-testid="reject-button" className="px-4 py-2 font-mono text-xs text-[#FFB4AB] ghost-border hover:bg-[#1C1B1B] transition-colors tracking-widest">
                        RECHAZAR
                      </button>
                    }
                    title="RECHAZAR SOLICITUD"
                    description={rejectReason ? `Razón: ${rejectReason}` : "Ingrese la razón de rechazo antes de confirmar."}
                    confirmLabel="RECHAZAR"
                    destructive
                    onConfirm={() => rejectMutation.mutate()}
                  />
                  <ConfirmDialog
                    trigger={
                      <button data-testid="cancel-button" className="px-4 py-2 font-mono text-xs text-[#FFB4AB] ghost-border hover:bg-[#1C1B1B] transition-colors tracking-widest">
                        ESCALAR CASO
                      </button>
                    }
                    title="CANCELAR SOLICITUD"
                    description={cancelReason ? `Razón: ${cancelReason}` : "Ingrese la razón de cancelación antes de confirmar."}
                    confirmLabel="CANCELAR SOLICITUD"
                    destructive
                    onConfirm={() => cancelMutation.mutate()}
                  />
                </>
              )}

              <ConfirmDialog
                trigger={
                  <button data-testid="add-note-button" className="px-3 py-1.5 font-mono text-[10px] text-mercury ghost-border hover:bg-[#1C1B1B] transition-colors tracking-widest">
                    + AGREGAR NOTA
                  </button>
                }
                title="AGREGAR NOTA AL HISTORIAL"
                description={noteText ? `Nota: "${noteText.substring(0, 80)}..."` : "Ingrese una nota para el historial."}
                confirmLabel="AGREGAR"
                onConfirm={() => addNoteMutation.mutate()}
              />
            </div>
          )}

          {/* Inline form fields for actions (filled before clicking confirm dialogs) */}
          {canManage && !isTerminated && status !== "CLOSED" && (
            <div className="surface-elevated ghost-border p-4 space-y-4">
              <div className="font-mono text-[11px] text-mercury tracking-wider uppercase mb-2">
                CAMPOS DE ACCIÓN
              </div>
              {status === "REGISTERED" && (
                <TerminalSelect
                  label="TIPO DE SOLICITUD (para clasificar)"
                  value={classifyTypeId}
                  onChange={setClassifyTypeId}
                  options={(requestTypes || []).map((t: any) => ({
                    value: String(t.id),
                    label: t.name,
                  }))}
                  placeholder="SELECCIONAR TIPO"
                />
              )}
              {(status === "REGISTERED" || status === "CLASSIFIED") && (
                <div className="grid grid-cols-2 gap-3">
                  <TerminalSelect
                    label="PRIORIDAD"
                    value={priorityValue}
                    onChange={setPriorityValue}
                    options={[
                      { value: "HIGH", label: "ALTA" },
                      { value: "MEDIUM", label: "ESTÁNDAR" },
                      { value: "LOW", label: "BAJA" },
                    ]}
                    placeholder="SELECCIONAR"
                  />
                  <TerminalInput
                    label="JUSTIFICACIÓN"
                    value={priorityJust}
                    onChange={(e) => setPriorityJust(e.target.value)}
                    placeholder="Justificación de prioridad"
                  />
                </div>
              )}
              {(status === "CLASSIFIED" || status === "IN_PROGRESS") && (
                <TerminalSelect
                  label="RESPONSABLE (para asignar)"
                  value={assignUserId}
                  onChange={setAssignUserId}
                  options={(staffUsers || [])
                    .filter((u: any) => u.role !== "STUDENT")
                    .map((u: any) => ({
                      value: String(u.id),
                      label: `${u.firstName} ${u.lastName}`,
                    }))}
                  placeholder="SELECCIONAR USUARIO"
                />
              )}
              {(status === "ATTENDED" || status === "IN_PROGRESS") && (
                <TerminalTextarea
                  label="OBSERVACIÓN DE CIERRE"
                  value={closeObs}
                  onChange={(e) => setCloseObs(e.target.value)}
                  placeholder="Observación de cierre requerida"
                />
              )}
              <TerminalInput
                label="OBSERVACIONES"
                value={classifyObs || assignObs || attendObs}
                onChange={(e) => {
                  setClassifyObs(e.target.value);
                  setAssignObs(e.target.value);
                  setAttendObs(e.target.value);
                }}
                placeholder="Observaciones generales"
              />
              <TerminalTextarea
                label="NOTA PARA HISTORIAL"
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Escriba una nota..."
              />
              <div className="grid grid-cols-2 gap-3">
                <TerminalTextarea
                  label="RAZÓN DE RECHAZO"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Razón de rechazo"
                />
                <TerminalTextarea
                  label="RAZÓN DE CANCELACIÓN"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Razón de cancelación"
                />
              </div>
            </div>
          )}
        </div>

        {/* Right panel */}
        <div className="space-y-4">
          {/* Requester info */}
          <div className="surface-elevated ghost-border p-4">
            <div className="font-mono text-[11px] text-mercury tracking-wider uppercase mb-3">
              INFORMACIÓN DE SOLICITANTE
            </div>
            <div className="space-y-2">
              <div>
                <div className="font-mono text-[9px] text-mercury opacity-40">NOMBRE</div>
                <div className="font-mono text-sm text-foreground">
                  {request.requester?.firstName} {request.requester?.lastName}
                </div>
              </div>
              <div>
                <div className="font-mono text-[9px] text-mercury opacity-40">IDENTIFICACIÓN</div>
                <div className="font-mono text-sm text-foreground">
                  {request.requester?.identification}
                </div>
              </div>
              <div>
                <div className="font-mono text-[9px] text-mercury opacity-40">CORREO</div>
                <div className="font-mono text-xs text-mercury">
                  {request.requester?.email}
                </div>
              </div>
            </div>
          </div>

          {/* Assigned */}
          <div className="surface-elevated ghost-border p-4">
            <div className="font-mono text-[11px] text-mercury tracking-wider uppercase mb-3">
              RESPONSABLE ASIGNADO
            </div>
            {request.assignedTo ? (
              <div className="space-y-2">
                <div className="font-mono text-sm text-foreground">
                  {request.assignedTo.firstName} {request.assignedTo.lastName}
                </div>
                <div className="font-mono text-xs text-mercury">
                  {request.assignedTo.email}
                </div>
              </div>
            ) : (
              <div className="font-mono text-xs text-mercury opacity-40">&gt;_ SIN ASIGNAR</div>
            )}
          </div>

          {/* Priority */}
          <div className="surface-elevated ghost-border p-4">
            <div className="font-mono text-[11px] text-mercury tracking-wider uppercase mb-3">
              PRIORIDAD
            </div>
            {request.priority ? (
              <PriorityBadge priority={request.priority as Priority} />
            ) : (
              <span className="font-mono text-xs text-mercury opacity-40">SIN ASIGNAR</span>
            )}
          </div>

          {/* Deadline */}
          {request.deadline && (
            <div className="surface-elevated ghost-border p-4">
              <div className="font-mono text-[11px] text-mercury tracking-wider uppercase mb-2">
                FECHA LÍMITE
              </div>
              <div className="font-mono text-sm text-foreground">
                {new Date(request.deadline).toLocaleDateString("es-CO")}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
