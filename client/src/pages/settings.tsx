import { useAuth } from "@/lib/auth";

export default function SettingsPage() {
  const { user } = useAuth();

  return (
    <div className="p-6 space-y-6">
      <h1
        className="text-3xl font-bold text-white tracking-[-0.02em]"
        style={{ fontFamily: "Inter, sans-serif" }}
      >
        AJUSTES DEL SISTEMA
      </h1>

      {/* Profile section */}
      <div className="bg-[#111111] border border-white/15 rounded-none p-5">
        <div className="font-mono text-[10px] text-[#C0C0C0] tracking-widest uppercase mb-4">
          PERFIL DE USUARIO
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="font-mono text-[9px] text-white/30 mb-1">NOMBRE COMPLETO</div>
            <div className="font-mono text-sm text-white">
              {user?.firstName} {user?.lastName}
            </div>
          </div>
          <div>
            <div className="font-mono text-[9px] text-white/30 mb-1">NOMBRE DE USUARIO</div>
            <div className="font-mono text-sm text-white">{user?.username}</div>
          </div>
          <div>
            <div className="font-mono text-[9px] text-white/30 mb-1">CORREO ELECTRÓNICO</div>
            <div className="font-mono text-sm text-[#C0C0C0]">{user?.email}</div>
          </div>
          <div>
            <div className="font-mono text-[9px] text-white/30 mb-1">IDENTIFICACIÓN</div>
            <div className="font-mono text-sm text-white">{user?.identification}</div>
          </div>
          <div>
            <div className="font-mono text-[9px] text-white/30 mb-1">ROL</div>
            <div className="font-mono text-sm text-white">{user?.role}</div>
          </div>
          <div>
            <div className="font-mono text-[9px] text-white/30 mb-1">ESTADO</div>
            <div className="font-mono text-sm text-[#4ADE80]">
              {user?.active ? "ACTIVO" : "INACTIVO"}
            </div>
          </div>
        </div>
      </div>

      {/* System preferences */}
      <div className="bg-[#111111] border border-white/15 rounded-none p-5">
        <div className="font-mono text-[10px] text-[#C0C0C0] tracking-widest uppercase mb-4">
          PREFERENCIAS DEL SISTEMA
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-white/5">
            <span className="font-mono text-xs text-[#C0C0C0]">IDIOMA</span>
            <span className="font-mono text-xs text-white">ESPAÑOL (CO)</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-white/5">
            <span className="font-mono text-xs text-[#C0C0C0]">ZONA HORARIA</span>
            <span className="font-mono text-xs text-white">America/Bogota (UTC-5)</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-white/5">
            <span className="font-mono text-xs text-[#C0C0C0]">TEMA</span>
            <span className="font-mono text-xs text-white">CYBER-CLASSICISM</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-white/5">
            <span className="font-mono text-xs text-[#C0C0C0]">NOTIFICACIONES</span>
            <span className="font-mono text-xs text-white/40">NO DISPONIBLE</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="font-mono text-xs text-[#C0C0C0]">VERSIÓN DEL SISTEMA</span>
            <span className="font-mono text-xs text-white">4.0.1-STABLE</span>
          </div>
        </div>
      </div>

      {/* Dither decoration */}
      <div className="font-mono text-[9px] text-white/10 tracking-widest text-center">
        ░▒▓ EL PANTEÓN DIGITAL — UNIVERSIDAD DEL QUINDÍO ▓▒░
      </div>
    </div>
  );
}
