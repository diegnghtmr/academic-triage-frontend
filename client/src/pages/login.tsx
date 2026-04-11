import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/lib/auth";
import { AsciiTemple } from "@/components/cyber/ascii-temple";
import { TerminalInput } from "@/components/cyber/terminal-input";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isAuthenticated) navigate("/dashboard");
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(username, password);
      navigate("/dashboard");
    } catch (err: any) {
      setError(err.message || "Error de autenticación");
    } finally {
      setLoading(false);
    }
  };

  const sessionId = `SES-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex">
      {/* Left side - Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-between p-8 lg:p-12">
        {/* Top left - Logo */}
        <div>
          <div className="flex items-start gap-4 mb-12">
            <AsciiTemple size="lg" />
            <div className="pt-2">
              <h1 className="text-2xl font-bold text-white tracking-[-0.02em]" style={{ fontFamily: "Inter, sans-serif" }}>
                TRIAGE ACADÉMICO
              </h1>
              <p className="font-mono text-[10px] text-[#C0C0C0] tracking-widest mt-1">
                EL PANTEÓN DIGITAL | UNIVERSIDAD DEL QUINDÍO
              </p>
            </div>
          </div>

          {/* Form */}
          <div className="max-w-sm">
            <div className="font-mono text-[10px] text-white/30 tracking-widest mb-6">
              ░▒▓ PROTOCOLO DE AUTENTICACIÓN ▓▒░
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <TerminalInput
                label="IDENTIDAD_USUARIO"
                placeholder="nombre.usuario"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
              />

              <TerminalInput
                label="CLAVE_ACCESO"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />

              {error && (
                <div className="font-mono text-xs text-[#FFB4AB] bg-[#3A1C1C] border border-[#FFB4AB]/20 rounded-none px-3 py-2">
                  &gt;_ ERROR: {error}
                </div>
              )}

              <button
                data-testid="login-button"
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-white text-[#0A0A0A] font-mono text-sm tracking-widest rounded-none hover:bg-[#E0E0E0] transition-colors disabled:opacity-50"
              >
                {loading ? "AUTENTICANDO..." : "INICIAR SESIÓN"}
              </button>
            </form>

            <div className="mt-6 space-y-2">
              <Link href="/register">
                <span className="block font-mono text-xs text-[#C0C0C0] hover:text-white transition-colors cursor-pointer">
                  &gt;_ CREAR CUENTA NUEVA
                </span>
              </Link>
              <span className="block font-mono text-xs text-white/30 cursor-not-allowed">
                &gt;_ RECUPERAR CREDENCIALES
              </span>
            </div>
          </div>
        </div>

        {/* Bottom left - System status */}
        <div className="mt-8">
          <div className="font-mono text-[9px] text-white/30 space-y-1">
            <div>SISTEMA: <span className="text-[#C0C0C0]">ACTIVO</span></div>
            <div>VERSIÓN: 4.0.1-STABLE</div>
            <div>PROTOCOLO: TLS 1.3 / AES-256</div>
          </div>
        </div>
      </div>

      {/* Right side - Hero */}
      <div className="hidden lg:flex w-1/2 bg-[#111111] border-l border-white/15 flex-col justify-between p-12 relative overflow-hidden">
        {/* Top right - Session metadata */}
        <div className="font-mono text-[9px] text-white/20 text-right space-y-1">
          <div>EST_SESSION_ID: {sessionId}</div>
          <div>LOCAL_TIME: {time.toISOString()}</div>
          <div>ENCRYPT_LEVEL: AES-256-GCM</div>
        </div>

        {/* Center - Large hero text */}
        <div className="flex-1 flex flex-col justify-center">
          <div className="font-mono text-[10px] text-white/10 tracking-[0.5em] mb-4">
            ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
          </div>
          <h2 className="text-5xl font-bold text-white tracking-[-0.04em] leading-tight" style={{ fontFamily: "Inter, sans-serif" }}>
            EXCELLENTIA<br />AD PERPETUUM
          </h2>
          <div className="font-mono text-[10px] text-white/10 tracking-[0.5em] mt-4">
            ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
          </div>
          <p className="font-mono text-xs text-[#C0C0C0] mt-8 tracking-widest">
            PROTOCOLO DE IDENTIDAD V4.0
          </p>
          <p className="font-mono text-[10px] text-white/30 mt-2">
            Sistema de gestión de solicitudes académicas<br />
            con clasificación inteligente y triage automatizado.
          </p>
        </div>

        {/* Bottom right - Decorative */}
        <div className="font-mono text-[9px] text-white/10 text-right">
          ▓▓▓▓▓▓▓▓▓▓ UNIVERSIDAD DEL QUINDÍO ▓▓▓▓▓▓▓▓▓▓
        </div>

        {/* Background dither pattern */}
        <div className="absolute inset-0 pointer-events-none font-mono text-[8px] text-white/[0.02] leading-[10px] overflow-hidden select-none whitespace-pre">
          {Array(60)
            .fill(null)
            .map((_, i) => (
              <div key={i}>
                {"░▒▓".repeat(40)}
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
