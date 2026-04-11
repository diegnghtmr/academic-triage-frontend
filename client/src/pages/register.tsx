import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/lib/auth";
import { AsciiTemple } from "@/components/cyber/ascii-temple";
import { TerminalInput } from "@/components/cyber/terminal-input";

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    identification: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { register, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (isAuthenticated) navigate("/dashboard");
  }, [isAuthenticated, navigate]);

  const update = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register(formData);
      navigate("/dashboard");
    } catch (err: any) {
      setError(err.message || "Error en el registro");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-8">
      <div className="max-w-lg w-full">
        <div className="flex items-start gap-4 mb-8">
          <AsciiTemple size="sm" />
          <div className="pt-2">
            <h1 className="text-2xl font-bold text-white tracking-[-0.02em]" style={{ fontFamily: "Inter, sans-serif" }}>
              REGISTRO DE CUENTA
            </h1>
            <p className="font-mono text-[10px] text-[#C0C0C0] tracking-widest mt-1">
              EL PANTEÓN DIGITAL | NUEVO USUARIO
            </p>
          </div>
        </div>

        <div className="font-mono text-[10px] text-white/30 tracking-widest mb-6">
          ░▒▓ PROTOCOLO DE REGISTRO ▓▒░
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <TerminalInput
              label="NOMBRE"
              placeholder="Juan"
              value={formData.firstName}
              onChange={update("firstName")}
            />
            <TerminalInput
              label="APELLIDO"
              placeholder="Pérez"
              value={formData.lastName}
              onChange={update("lastName")}
            />
          </div>

          <TerminalInput
            label="IDENTIFICACIÓN"
            placeholder="1090XXXXXXX"
            value={formData.identification}
            onChange={update("identification")}
          />

          <TerminalInput
            label="CORREO ELECTRÓNICO"
            type="email"
            placeholder="usuario@uniquindio.edu.co"
            value={formData.email}
            onChange={update("email")}
          />

          <TerminalInput
            label="NOMBRE DE USUARIO"
            placeholder="nombre.usuario"
            value={formData.username}
            onChange={update("username")}
          />

          <TerminalInput
            label="CLAVE_ACCESO"
            type="password"
            placeholder="••••••••"
            value={formData.password}
            onChange={update("password")}
          />

          {error && (
            <div className="font-mono text-xs text-[#F87171] bg-[#3A1C1C] border border-[#F87171]/20 rounded-none px-3 py-2">
              &gt;_ ERROR: {error}
            </div>
          )}

          <button
            data-testid="register-button"
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-white text-[#0A0A0A] font-mono text-sm tracking-widest rounded-none hover:bg-[#C0C0C0] transition-colors disabled:opacity-50"
          >
            {loading ? "PROCESANDO..." : "REGISTRAR CUENTA"}
          </button>
        </form>

        <div className="mt-6">
          <Link href="/login">
            <span className="font-mono text-xs text-[#C0C0C0] hover:text-white transition-colors cursor-pointer">
              &gt;_ VOLVER A INICIAR SESIÓN
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
