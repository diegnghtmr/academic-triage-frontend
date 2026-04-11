import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { StatCard } from "@/components/cyber/stat-card";
import { DataTable } from "@/components/cyber/data-table";
import { TerminalInput, TerminalSelect } from "@/components/cyber/terminal-input";
import { ConfirmDialog } from "@/components/cyber/confirm-dialog";

type Tab = "rules" | "types" | "channels" | "permissions";

export default function CatalogsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("rules");

  // Business Rules form
  const [ruleName, setRuleName] = useState("");
  const [ruleDesc, setRuleDesc] = useState("");
  const [ruleCondType, setRuleCondType] = useState("");
  const [ruleCondVal, setRuleCondVal] = useState("");
  const [rulePriority, setRulePriority] = useState("");
  const [ruleTypeId, setRuleTypeId] = useState("");

  // Request Types form
  const [typeName, setTypeName] = useState("");
  const [typeDesc, setTypeDesc] = useState("");

  // Origin Channels form
  const [channelName, setChannelName] = useState("");

  // Edit states
  const [editingRuleId, setEditingRuleId] = useState<number | null>(null);
  const [editingTypeId, setEditingTypeId] = useState<number | null>(null);
  const [editingChannelId, setEditingChannelId] = useState<number | null>(null);

  const { data: rules } = useQuery<any[]>({ queryKey: ["/api/business-rules"] });
  const { data: requestTypes } = useQuery<any[]>({ queryKey: ["/api/catalogs/request-types"] });
  const { data: originChannels } = useQuery<any[]>({ queryKey: ["/api/catalogs/origin-channels"] });
  const { data: users } = useQuery<any[]>({ queryKey: ["/api/users"] });

  // Business Rules mutations
  const createRuleMutation = useMutation({
    mutationFn: async () => {
      const body: any = {
        name: ruleName,
        description: ruleDesc,
        conditionType: ruleCondType,
        conditionValue: ruleCondVal,
        resultingPriority: rulePriority,
        active: true,
      };
      if (ruleTypeId) body.requestTypeId = Number(ruleTypeId);
      if (editingRuleId) {
        await apiRequest("PUT", `/api/business-rules/${editingRuleId}`, body);
      } else {
        await apiRequest("POST", "/api/business-rules", body);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/business-rules"] });
      resetRuleForm();
    },
  });

  const deleteRuleMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/business-rules/${id}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/business-rules"] }),
  });

  const toggleRuleMutation = useMutation({
    mutationFn: async ({ id, active }: { id: number; active: boolean }) => {
      await apiRequest("PUT", `/api/business-rules/${id}`, { active });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/business-rules"] }),
  });

  // Request Types mutations
  const saveTypeMutation = useMutation({
    mutationFn: async () => {
      if (editingTypeId) {
        await apiRequest("PUT", `/api/catalogs/request-types/${editingTypeId}`, {
          name: typeName,
          description: typeDesc,
        });
      } else {
        await apiRequest("POST", "/api/catalogs/request-types", {
          name: typeName,
          description: typeDesc,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/catalogs/request-types"] });
      resetTypeForm();
    },
  });

  // Origin Channels mutations
  const saveChannelMutation = useMutation({
    mutationFn: async () => {
      if (editingChannelId) {
        await apiRequest("PUT", `/api/catalogs/origin-channels/${editingChannelId}`, {
          name: channelName,
        });
      } else {
        await apiRequest("POST", "/api/catalogs/origin-channels", { name: channelName });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/catalogs/origin-channels"] });
      resetChannelForm();
    },
  });

  // Reset helpers
  const resetRuleForm = () => {
    setEditingRuleId(null);
    setRuleName("");
    setRuleDesc("");
    setRuleCondType("");
    setRuleCondVal("");
    setRulePriority("");
    setRuleTypeId("");
  };

  const resetTypeForm = () => {
    setEditingTypeId(null);
    setTypeName("");
    setTypeDesc("");
  };

  const resetChannelForm = () => {
    setEditingChannelId(null);
    setChannelName("");
  };

  const openEditRule = (rule: any) => {
    setEditingRuleId(rule.id);
    setRuleName(rule.name);
    setRuleDesc(rule.description || "");
    setRuleCondType(rule.conditionType);
    setRuleCondVal(rule.conditionValue);
    setRulePriority(rule.resultingPriority);
    setRuleTypeId(rule.requestTypeId ? String(rule.requestTypeId) : "");
  };

  const openEditType = (type: any) => {
    setEditingTypeId(type.id);
    setTypeName(type.name);
    setTypeDesc(type.description || "");
  };

  const openEditChannel = (channel: any) => {
    setEditingChannelId(channel.id);
    setChannelName(channel.name);
  };

  const totalUsers = (users || []).length;
  const activeRules = (rules || []).filter((r) => r.active).length;

  const tabs: { key: Tab; label: string }[] = [
    { key: "rules", label: "REGLAS DE NEGOCIO" },
    { key: "types", label: "TIPOS DE SOLICITUD" },
    { key: "channels", label: "CANALES DE ORIGEN" },
    { key: "permissions", label: "PERMISOS GLOBALES" },
  ];

  // Rule columns
  const ruleColumns = [
    {
      key: "name",
      header: "NOMBRE_REGLA",
      render: (row: any) => <span className="text-foreground">{row.name}</span>,
    },
    {
      key: "condition",
      header: "CONDICIÓN LÓGICA",
      mono: true,
      render: (row: any) => (
        <code className="font-mono text-[10px] text-mercury bg-[#2A2A2A] px-2 py-0.5">
          {row.conditionType}:{row.conditionValue}
        </code>
      ),
    },
    {
      key: "resultingPriority",
      header: "PRIORIDAD",
      mono: true,
      render: (row: any) => <span className="text-mercury">{row.resultingPriority}</span>,
    },
    {
      key: "active",
      header: "ESTADO",
      render: (row: any) => (
        <button
          data-testid={`toggle-rule-${row.id}`}
          onClick={(e) => {
            e.stopPropagation();
            toggleRuleMutation.mutate({ id: row.id, active: !row.active });
          }}
          className={`font-mono text-[10px] px-2 py-0.5 ghost-border transition-colors ${
            row.active ? "text-foreground" : "text-mercury opacity-40"
          }`}
        >
          {row.active ? "ACTIVA" : "INACTIVA"}
        </button>
      ),
    },
    {
      key: "actions",
      header: "ACCIÓN",
      render: (row: any) => (
        <div className="flex gap-2">
          <button
            data-testid={`edit-rule-${row.id}`}
            onClick={(e) => {
              e.stopPropagation();
              openEditRule(row);
            }}
            className="font-mono text-[9px] text-mercury ghost-border px-2 py-0.5 hover:bg-[#1C1B1B] transition-colors"
          >
            EDITAR
          </button>
          <button
            data-testid={`delete-rule-${row.id}`}
            onClick={(e) => {
              e.stopPropagation();
              deleteRuleMutation.mutate(row.id);
            }}
            className="font-mono text-[9px] text-[#FFB4AB] ghost-border px-2 py-0.5 hover:bg-[#1C1B1B] transition-colors"
          >
            ELIMINAR
          </button>
        </div>
      ),
    },
  ];

  const typeColumns = [
    {
      key: "name",
      header: "NOMBRE",
      render: (row: any) => <span className="text-foreground">{row.name}</span>,
    },
    {
      key: "description",
      header: "DESCRIPCIÓN",
      render: (row: any) => <span className="text-mercury">{row.description || "—"}</span>,
    },
    {
      key: "active",
      header: "ESTADO",
      render: (row: any) => (
        <span className={`font-mono text-[10px] ${row.active ? "text-foreground" : "text-mercury opacity-40"}`}>
          {row.active ? "ACTIVO" : "INACTIVO"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "ACCIÓN",
      render: (row: any) => (
        <button
          data-testid={`edit-type-${row.id}`}
          onClick={(e) => {
            e.stopPropagation();
            openEditType(row);
          }}
          className="font-mono text-[9px] text-mercury ghost-border px-2 py-0.5 hover:bg-[#1C1B1B] transition-colors"
        >
          EDITAR
        </button>
      ),
    },
  ];

  const channelColumns = [
    {
      key: "name",
      header: "NOMBRE",
      render: (row: any) => <span className="text-foreground">{row.name}</span>,
    },
    {
      key: "active",
      header: "ESTADO",
      render: (row: any) => (
        <span className={`font-mono text-[10px] ${row.active ? "text-foreground" : "text-mercury opacity-40"}`}>
          {row.active ? "ACTIVO" : "INACTIVO"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "ACCIÓN",
      render: (row: any) => (
        <button
          data-testid={`edit-channel-${row.id}`}
          onClick={(e) => {
            e.stopPropagation();
            openEditChannel(row);
          }}
          className="font-mono text-[9px] text-mercury ghost-border px-2 py-0.5 hover:bg-[#1C1B1B] transition-colors"
        >
          EDITAR
        </button>
      ),
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
            CONTROL ARQUITECTÓNICO
          </h1>
          <div className="flex gap-4 mt-2">
            <span className="font-mono text-[10px] text-mercury">
              ESTADO DE RED: <span className="text-foreground">ACTIVO</span>
            </span>
            <span className="font-mono text-[10px] text-mercury">
              NIVEL DE TRIAGE: <span className="text-foreground">OPERATIVO</span>
            </span>
          </div>
        </div>
        <ConfirmDialog
          trigger={
            <button
              data-testid="new-rule-button"
              className="px-4 py-2.5 bg-white text-[#0A0A0A] font-mono text-xs tracking-widest rounded-none hover:bg-[#E0E0E0] transition-colors"
            >
              {activeTab === "types"
                ? "+ NUEVO TIPO"
                : activeTab === "channels"
                ? "+ NUEVO CANAL"
                : "+ NUEVA REGLA"}
            </button>
          }
          title={
            activeTab === "types"
              ? "NUEVO TIPO DE SOLICITUD"
              : activeTab === "channels"
              ? "NUEVO CANAL DE ORIGEN"
              : "NUEVA REGLA DE NEGOCIO"
          }
          description={
            activeTab === "types"
              ? `Crear tipo: ${typeName || "(nombre pendiente)"}`
              : activeTab === "channels"
              ? `Crear canal: ${channelName || "(nombre pendiente)"}`
              : `Crear regla: ${ruleName || "(nombre pendiente)"}`
          }
          confirmLabel="CREAR"
          onConfirm={() => {
            if (activeTab === "types") saveTypeMutation.mutate();
            else if (activeTab === "channels") saveChannelMutation.mutate();
            else createRuleMutation.mutate();
          }}
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="TOTAL USUARIOS" value={totalUsers} />
        <StatCard label="REGLAS ACTIVAS" value={activeRules} dither="▒▒▒" />
        <StatCard
          label="CARGA SISTEMA"
          value={`${Math.min(100, Math.round(((rules || []).length + (requestTypes || []).length) * 3.3))}%`}
          dither="▓▓▓"
        />
        <StatCard label="TICKETS/HORA" value="—" sublabel="DATOS NO DISPONIBLES" />
      </div>

      {/* Tabs */}
      <div className="flex ghost-border-b">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            data-testid={`tab-${tab.key}`}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 font-mono text-[10px] tracking-widest transition-colors border-b-2 ${
              activeTab === tab.key
                ? "text-foreground border-foreground"
                : "text-mercury border-transparent hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Inline form for creating/editing */}
      {(activeTab === "rules" || activeTab === "types" || activeTab === "channels") && (
        <div className="surface-elevated ghost-border p-4 space-y-3">
          <div className="font-mono text-[11px] text-mercury tracking-wider uppercase mb-2">
            {editingRuleId || editingTypeId || editingChannelId ? "EDITAR REGISTRO" : "FORMULARIO DE REGISTRO"}
          </div>

          {activeTab === "rules" && (
            <div className="grid grid-cols-2 gap-3">
              <TerminalInput label="NOMBRE" value={ruleName} onChange={(e) => setRuleName(e.target.value)} placeholder="Nombre de la regla" />
              <TerminalInput label="DESCRIPCIÓN" value={ruleDesc} onChange={(e) => setRuleDesc(e.target.value)} placeholder="Descripción" />
              <TerminalSelect
                label="TIPO DE CONDICIÓN"
                value={ruleCondType}
                onChange={setRuleCondType}
                options={[
                  { value: "REQUEST_TYPE", label: "TIPO DE SOLICITUD" },
                  { value: "DEADLINE", label: "FECHA LÍMITE" },
                  { value: "REQUEST_TYPE_AND_DEADLINE", label: "TIPO + FECHA LÍMITE" },
                ]}
                placeholder="SELECCIONAR"
              />
              <TerminalInput label="VALOR DE CONDICIÓN" value={ruleCondVal} onChange={(e) => setRuleCondVal(e.target.value)} placeholder="ej: 3 (días)" />
              <TerminalSelect
                label="PRIORIDAD RESULTANTE"
                value={rulePriority}
                onChange={setRulePriority}
                options={[
                  { value: "HIGH", label: "ALTA" },
                  { value: "MEDIUM", label: "ESTÁNDAR" },
                  { value: "LOW", label: "BAJA" },
                ]}
                placeholder="SELECCIONAR"
              />
              <TerminalSelect
                label="TIPO DE SOLICITUD (OPC.)"
                value={ruleTypeId}
                onChange={setRuleTypeId}
                options={(requestTypes || []).map((t: any) => ({
                  value: String(t.id),
                  label: t.name,
                }))}
                placeholder="TODOS"
              />
            </div>
          )}

          {activeTab === "types" && (
            <div className="grid grid-cols-2 gap-3">
              <TerminalInput label="NOMBRE" value={typeName} onChange={(e) => setTypeName(e.target.value)} placeholder="Nombre del tipo" />
              <TerminalInput label="DESCRIPCIÓN" value={typeDesc} onChange={(e) => setTypeDesc(e.target.value)} placeholder="Descripción" />
            </div>
          )}

          {activeTab === "channels" && (
            <TerminalInput label="NOMBRE" value={channelName} onChange={(e) => setChannelName(e.target.value)} placeholder="Nombre del canal" />
          )}

          <div className="flex gap-2 pt-2">
            <button
              data-testid="save-form-button"
              onClick={() => {
                if (activeTab === "rules") createRuleMutation.mutate();
                else if (activeTab === "types") saveTypeMutation.mutate();
                else saveChannelMutation.mutate();
              }}
              className="px-4 py-2 bg-white text-[#0A0A0A] font-mono text-xs tracking-widest rounded-none hover:bg-[#E0E0E0] transition-colors"
            >
              {editingRuleId || editingTypeId || editingChannelId ? "ACTUALIZAR" : "GUARDAR"}
            </button>
            {(editingRuleId || editingTypeId || editingChannelId) && (
              <button
                data-testid="cancel-edit-button"
                onClick={() => {
                  resetRuleForm();
                  resetTypeForm();
                  resetChannelForm();
                }}
                className="px-4 py-2 font-mono text-xs text-mercury ghost-border hover:bg-[#1C1B1B] transition-colors tracking-widest"
              >
                CANCELAR
              </button>
            )}
          </div>
        </div>
      )}

      {/* Tab content tables */}
      {activeTab === "rules" && (
        <DataTable columns={ruleColumns} data={rules || []} getRowKey={(row: any) => String(row.id)} />
      )}
      {activeTab === "types" && (
        <DataTable columns={typeColumns} data={requestTypes || []} getRowKey={(row: any) => String(row.id)} />
      )}
      {activeTab === "channels" && (
        <DataTable columns={channelColumns} data={originChannels || []} getRowKey={(row: any) => String(row.id)} />
      )}
      {activeTab === "permissions" && (
        <div className="surface-elevated ghost-border p-8 text-center">
          <div className="font-mono text-xs text-mercury opacity-40">
            &gt;_ MÓDULO DE PERMISOS EN DESARROLLO
          </div>
          <div className="font-mono text-[10px] text-mercury opacity-20 mt-2">
            Los permisos se administran a nivel de rol (ADMIN, STAFF, STUDENT)
          </div>
        </div>
      )}
    </div>
  );
}
