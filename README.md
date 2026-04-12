# academic-triage-frontend

**SPA Angular 20** — Cliente web del sistema de triage académico que consume exclusivamente el backend oficial.

## Arquitectura actual

Esta aplicación es una **Single Page Application (SPA) Angular 20 standalone** que consume el backend oficial **`academic-triage-system`** mediante **`/api/v1`**. 

- ✅ **SPA principal**: `src/app/` (Angular 20, standalone components, Scope Rule)
- 📄 **Cliente legacy**: `client/` (React, solo como referencia visual durante migración)
- ❌ **Backend local**: eliminado (FE-060)
- ❌ **Base de datos local**: eliminada (FE-061)

## Stack tecnológico

- **Frontend principal**: Angular 20, TypeScript, Tailwind CSS, RxJS, Signals
- **Backend**: `academic-triage-system` (externo, `/api/v1`)
- **Contrato**: OpenAPI 3.0 ([`docs/openapi-academic-triage.yaml`](docs/openapi-academic-triage.yaml))

## Contrato y reglas de integración (Fase 1)

| Recurso | Descripción |
|---------|-------------|
| [`docs/openapi-academic-triage.yaml`](docs/openapi-academic-triage.yaml) | **Contrato canónico** del cliente (fuente de verdad junto al backend oficial). |
| [`docs/migration/official-backend.md`](docs/migration/official-backend.md) | Reglas de integración, prohibiciones, DTOs/adapters, errores y paginación. |
| [`docs/migration/local-dev-runbook.md`](docs/migration/local-dev-runbook.md) | Runbook de desarrollo local y alineación con el backend en `http://localhost:8080/api/v1`. |

**Base URL local del API oficial:** `http://localhost:8080/api/v1`

## Comandos principales (SPA Angular)

| Comando | Uso |
|---------|-----|
| `npm run dev` / `npm run start` | Servidor de desarrollo Angular (`ng serve academic-triage-spa`) |
| `npm run build` | Build de producción Angular (`ng build academic-triage-spa`) |
| `npm run ng -- [comando]` | CLI de Angular para scaffolding, tests, etc. |

- **Base URL del API**: `http://localhost:8080/api/v1` (configurado en `src/app/core/config/env.ts`)
- **Proxy opcional**: `ng serve --proxy-config docs/migration/angular-proxy.conf.example.json`

## Comandos legacy (solo durante migración)

| Comando | Uso |
|---------|-----|
| `npm run build:legacy` | Build del cliente React legacy en `client/` (solo referencia visual) |
| `npm run check` | Typecheck del código legacy (`tsconfig.legacy.json`) |

## Documentación adicional

| Documento | Propósito |
|-----------|-----------|
| [`docs/migration/official-backend.md`](docs/migration/official-backend.md) | Reglas de integración con el backend oficial |
| [`docs/migration/local-dev-runbook.md`](docs/migration/local-dev-runbook.md) | Setup de desarrollo local |
| `FRONTEND_OFFICIAL_BACKEND_MIGRATION_PRD.md` | PRD completo de la migración |
| `FRONTEND_OFFICIAL_BACKEND_BACKLOG.md` | Backlog detallado de tareas |

**Nota**: El cliente React en `client/` permanece como referencia visual durante la migración pero no es la aplicación principal.
