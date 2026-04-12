# academic-triage-frontend

**SPA Angular 20** — Cliente web del sistema de triage académico que consume exclusivamente el backend oficial.

## Arquitectura

Esta aplicación es una **Single Page Application (SPA) Angular 20 standalone** que consume el backend oficial **`academic-triage-system`** mediante **`/api/v1`**.

- ✅ **SPA activa**: `src/app/` (Angular 20, standalone components, Scope Rule)
- ❌ **Backend local**: eliminado (FE-060)
- ❌ **Base de datos local**: eliminada (FE-061)
- 🗂 **Árbol legacy**: `client/` **eliminado** en Phase 4 del cutover Angular (2026-04-12) — contexto histórico en `docs/archive/react-reference/`

## Stack tecnológico

- **Frontend**: Angular 20, TypeScript, Tailwind CSS, RxJS, Signals
- **Backend**: `academic-triage-system` (externo, `/api/v1`)
- **Contrato**: OpenAPI 3.0 ([`docs/openapi-academic-triage.yaml`](docs/openapi-academic-triage.yaml))

## Contrato y reglas de integración

| Recurso | Descripción |
|---------|-------------|
| [`docs/openapi-academic-triage.yaml`](docs/openapi-academic-triage.yaml) | **Contrato canónico** del cliente (fuente de verdad junto al backend oficial). |
| [`docs/migration/official-backend.md`](docs/migration/official-backend.md) | Reglas de integración, prohibiciones, DTOs/adapters, errores y paginación. |
| [`docs/migration/local-dev-runbook.md`](docs/migration/local-dev-runbook.md) | Runbook de desarrollo local y alineación con el backend en `http://localhost:8080/api/v1`. |

**Base URL local del API oficial:** `http://localhost:8080/api/v1`

## Comandos

| Comando | Uso |
|---------|-----|
| `npm run dev` / `npm run start` | Servidor de desarrollo Angular (`ng serve academic-triage-spa`) |
| `npm run build` | Build de producción Angular (`ng build academic-triage-spa`) |
| `npm run check` | Typecheck del código fuente Angular (`tsc -p tsconfig.app.json --noEmit`) |
| `npm run lint` | Lint Angular + TypeScript (0 warnings permitidos) |
| `npm run test:unit` | Tests unitarios con Vitest |
| `npm run test:e2e` | Tests E2E con Playwright (requiere Angular dev server activo o lo levanta automáticamente) |
| `npm run ng -- [comando]` | CLI de Angular para scaffolding, generación de código, etc. |

- **Base URL del API**: `http://localhost:8080/api/v1` (configurado en `src/app/core/config/env.ts`)
- **Proxy opcional**: `ng serve --proxy-config docs/migration/angular-proxy.conf.example.json`

## Documentación adicional

| Documento | Propósito |
|-----------|-----------|
| [`docs/migration/official-backend.md`](docs/migration/official-backend.md) | Reglas de integración con el backend oficial |
| [`docs/migration/local-dev-runbook.md`](docs/migration/local-dev-runbook.md) | Setup de desarrollo local |
| [`docs/migration/cutover-parity-ledger.md`](docs/migration/cutover-parity-ledger.md) | Ledger de paridad Angular/legacy — gate de cutover completo |
| [`docs/archive/react-reference/`](docs/archive/react-reference/) | Referencia histórica del stack React (no operativo) |
