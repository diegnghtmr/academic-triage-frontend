import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
      <div className="text-center space-y-6">
        <div className="font-mono text-[10px] text-white/10 tracking-[0.5em]">
          ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
        </div>
        <div className="font-mono text-6xl text-white font-bold tracking-tight">404</div>
        <div className="font-mono text-sm text-[#C0C0C0]">
          &gt;_ ERROR 404: RECURSO NO ENCONTRADO EN EL PANTEÓN
        </div>
        <div className="font-mono text-xs text-white/30">
          La ruta solicitada no existe en este dominio.
        </div>
        <div className="font-mono text-[10px] text-white/10 tracking-[0.5em]">
          ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
        </div>
        <Link href="/dashboard">
          <button
            data-testid="go-home-button"
            className="px-6 py-2.5 bg-white text-[#0A0A0A] font-mono text-xs tracking-widest rounded-none hover:bg-[#C0C0C0] transition-colors"
          >
            VOLVER AL PANEL
          </button>
        </Link>
      </div>
    </div>
  );
}
