import { useEffect } from "react";
import { useLocation } from "wouter";

export default function BusinessRulesPage() {
  const [, navigate] = useLocation();

  useEffect(() => {
    navigate("/catalogs");
  }, [navigate]);

  return (
    <div className="p-6">
      <div className="font-mono text-xs text-white/30">&gt;_ REDIRIGIENDO A CATÁLOGOS...</div>
    </div>
  );
}
