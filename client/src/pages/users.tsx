import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { DataTable } from "@/components/cyber/data-table";
import { TerminalInput, TerminalSelect } from "@/components/cyber/terminal-input";

export default function UsersPage() {
  const [editingUser, setEditingUser] = useState<any>(null);
  const [editRole, setEditRole] = useState("");
  const [editActive, setEditActive] = useState("true");
  const [editEmail, setEditEmail] = useState("");
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");

  const { data: usersData } = useQuery<any>({ queryKey: ["/api/users"] });
  const users = Array.isArray(usersData) ? usersData : (usersData?.data || []);

  const updateUserMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PUT", `/api/users/${editingUser.id}`, {
        role: editRole || undefined,
        active: editActive === "true",
        email: editEmail || undefined,
        firstName: editFirstName || undefined,
        lastName: editLastName || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setEditingUser(null);
    },
  });

  const openEdit = (user: any) => {
    setEditingUser(user);
    setEditRole(user.role);
    setEditActive(user.active ? "true" : "false");
    setEditEmail(user.email);
    setEditFirstName(user.firstName);
    setEditLastName(user.lastName);
  };

  const columns = [
    {
      key: "id",
      header: "ID",
      mono: true,
      render: (row: any) => (
        <span className="text-mercury">{String(row.id).padStart(3, "0")}</span>
      ),
    },
    {
      key: "name",
      header: "NOMBRE",
      render: (row: any) => (
        <div>
          <div className="text-foreground">{row.firstName} {row.lastName}</div>
          <div className="text-[9px] text-mercury opacity-40 font-mono">{row.username}</div>
        </div>
      ),
    },
    {
      key: "email",
      header: "CORREO",
      render: (row: any) => <span className="text-mercury">{row.email}</span>,
    },
    {
      key: "identification",
      header: "IDENTIFICACIÓN",
      mono: true,
      render: (row: any) => <span className="text-mercury">{row.identification}</span>,
    },
    {
      key: "role",
      header: "ROL",
      render: (row: any) => (
        <span className={`font-mono text-[10px] px-2 py-0.5 ghost-border ${
          row.role === "ADMIN" ? "text-foreground" : "text-mercury"
        }`}>
          {row.role}
        </span>
      ),
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
          data-testid={`edit-user-${row.id}`}
          onClick={(e) => {
            e.stopPropagation();
            openEdit(row);
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
      <div className="flex items-start justify-between">
        <div>
          <h1
            className="text-3xl font-bold text-foreground tracking-[-0.02em]"
            style={{ fontFamily: "Inter, sans-serif" }}
          >
            USUARIOS DEL SISTEMA
          </h1>
          <div className="font-mono text-xs text-mercury mt-1">
            {(users || []).length} REGISTROS EN BASE DE DATOS
          </div>
        </div>
      </div>

      {/* Edit form */}
      {editingUser && (
        <div className="surface-elevated ghost-border p-4 space-y-3">
          <div className="font-mono text-[11px] text-mercury tracking-wider uppercase mb-2">
            EDITAR USUARIO: {editingUser.username}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <TerminalInput label="NOMBRE" value={editFirstName} onChange={(e) => setEditFirstName(e.target.value)} />
            <TerminalInput label="APELLIDO" value={editLastName} onChange={(e) => setEditLastName(e.target.value)} />
            <TerminalInput label="CORREO" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
            <TerminalSelect
              label="ROL"
              value={editRole}
              onChange={setEditRole}
              options={[
                { value: "ADMIN", label: "ADMINISTRADOR" },
                { value: "STAFF", label: "PERSONAL" },
                { value: "STUDENT", label: "ESTUDIANTE" },
              ]}
              placeholder="SELECCIONAR ROL"
            />
            <TerminalSelect
              label="ESTADO"
              value={editActive}
              onChange={setEditActive}
              options={[
                { value: "true", label: "ACTIVO" },
                { value: "false", label: "INACTIVO" },
              ]}
              placeholder="SELECCIONAR"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button
              data-testid="save-user-button"
              onClick={() => updateUserMutation.mutate()}
              className="px-4 py-2 bg-white text-[#0A0A0A] font-mono text-xs tracking-widest rounded-none hover:bg-[#E0E0E0] transition-colors"
            >
              ACTUALIZAR
            </button>
            <button
              data-testid="cancel-user-edit"
              onClick={() => setEditingUser(null)}
              className="px-4 py-2 font-mono text-xs text-mercury ghost-border hover:bg-[#1C1B1B] transition-colors tracking-widest"
            >
              CANCELAR
            </button>
          </div>
        </div>
      )}

      <DataTable columns={columns} data={users || []} getRowKey={(row: any) => String(row.id)} />
    </div>
  );
}
