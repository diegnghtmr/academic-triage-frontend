import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { TerminalInput, TerminalTextarea, TerminalSelect } from "@/components/cyber/terminal-input";
import { ConfirmDialog } from "@/components/cyber/confirm-dialog";

export default function CreateRequestPage() {
  const [, navigate] = useLocation();
  const [description, setDescription] = useState("");
  const [requestTypeId, setRequestTypeId] = useState("");
  const [originChannelId, setOriginChannelId] = useState("");
  const [deadline, setDeadline] = useState("");
  const [error, setError] = useState("");

  const { data: requestTypes } = useQuery<any[]>({
    queryKey: ["/api/catalogs/request-types"],
  });

  const { data: originChannels } = useQuery<any[]>({
    queryKey: ["/api/catalogs/origin-channels"],
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const body: any = { description };
      if (requestTypeId) body.requestTypeId = Number(requestTypeId);
      if (originChannelId) body.originChannelId = Number(originChannelId);
      if (deadline) body.deadline = deadline;
      const res = await apiRequest("POST", "/api/requests", body);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/requests"] });
      navigate(`/requests/${data.id}`);
    },
    onError: (err: any) => {
      setError(err.message || "Error al crear solicitud");
    },
  });

  return (
    <div className="p-6 max-w-2xl">
      <h1
        className="text-2xl font-bold text-foreground tracking-[-0.02em] mb-1"
        style={{ fontFamily: "Inter, sans-serif" }}
      >
        NUEVA SOLICITUD
      </h1>
      <div className="font-mono text-[10px] text-mercury opacity-30 tracking-widest mb-6">
        ░▒▓ PROTOCOLO DE REGISTRO DE SOLICITUD ▓▒░
      </div>

      <div className="space-y-5">
        <TerminalSelect
          label="TIPO DE SOLICITUD"
          value={requestTypeId}
          onChange={setRequestTypeId}
          options={
            (requestTypes || [])
              .filter((t: any) => t.active)
              .map((t: any) => ({
                value: String(t.id),
                label: t.name,
              }))
          }
          placeholder="SELECCIONAR TIPO (OPCIONAL)"
        />

        <TerminalSelect
          label="CANAL DE ORIGEN"
          value={originChannelId}
          onChange={setOriginChannelId}
          options={
            (originChannels || [])
              .filter((c: any) => c.active)
              .map((c: any) => ({
                value: String(c.id),
                label: c.name,
              }))
          }
          placeholder="SELECCIONAR CANAL (OPCIONAL)"
        />

        <TerminalTextarea
          label="DESCRIPCIÓN DE LA SOLICITUD"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describa su solicitud en detalle..."
          rows={6}
        />

        <TerminalInput
          label="FECHA LÍMITE (OPCIONAL)"
          type="date"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
        />

        {error && (
          <div className="font-mono text-xs text-[#FFB4AB] bg-[#1C1B1B] ghost-border px-3 py-2">
            &gt;_ ERROR: {error}
          </div>
        )}

        <ConfirmDialog
          trigger={
            <button
              data-testid="submit-request-button"
              disabled={createMutation.isPending || !description.trim()}
              className="w-full py-3 bg-white text-[#0A0A0A] font-mono text-sm tracking-widest rounded-none hover:bg-[#E0E0E0] transition-colors disabled:opacity-50"
            >
              {createMutation.isPending ? "PROCESANDO..." : "ENVIAR SOLICITUD"}
            </button>
          }
          title="CONFIRMAR ENVÍO"
          description={`¿Desea enviar esta solicitud? La descripción tiene ${description.length} caracteres.`}
          confirmLabel="ENVIAR"
          onConfirm={() => createMutation.mutate()}
        />
      </div>
    </div>
  );
}
