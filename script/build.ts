/**
 * Script de build LEGACY para el cliente React en client/
 * 
 * NOTA: Este script solo existe para mantener la referencia visual del cliente React
 * mientras la migración a Angular SPA está en progreso. 
 * 
 * Para la aplicación principal (Angular SPA): use `ng build academic-triage-spa`
 * Para el cliente legacy (referencia): use `npm run build:legacy`
 */
import { build as viteBuild } from "vite";
import { rm } from "fs/promises";

async function buildLegacyClient() {
  await rm("dist", { recursive: true, force: true });

  console.log("🔧 Building React legacy client (client/) for reference...");
  console.log("   Main SPA: Use 'ng build academic-triage-spa' instead");
  await viteBuild();
}

buildLegacyClient().catch((err) => {
  console.error(err);
  process.exit(1);
});
