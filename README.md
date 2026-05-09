# Academic Triage System Frontend

Angular 20 SPA that acts as the web client for the academic triage system at Universidad del Quindío. It consumes **exclusively** the official [`academic-triage-system`](../academic-triage-system) backend through `/api/v1`.

This project is intentionally built as a **contract-disciplined frontend**. The UI never duplicates business rules: it honors the official backend contract, uses explicit per-feature adapters, and leaves all domain authority on the backend.

---

## Table of Contents

- [Why this project exists](#why-this-project-exists)
- [Core features](#core-features)
- [Design philosophy](#design-philosophy)
- [Architecture overview](#architecture-overview)
- [Technology stack](#technology-stack)
- [Repository structure](#repository-structure)
- [Getting started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Run locally](#run-locally)
  - [Run against the official backend](#run-against-the-official-backend)
- [Environment configuration](#environment-configuration)
- [Idempotency & concurrency contract](#idempotency--concurrency-contract)
- [Testing](#testing)
- [API documentation](#api-documentation)
- [Security model](#security-model)
- [Operational validation](#operational-validation)
- [Project status](#project-status)

---

## Why this project exists

Academic service desks tend to fail for the same reasons: unclear intake, inconsistent categorization, manual prioritization, weak traceability, and no operational visibility. The backend solves the domain; this frontend exposes it with a coherent experience for the three roles in the system.

The SPA provides:

- a standalone, lazy-loaded SPA surface
- a role-aware UI driven by `ADMIN`, `STAFF`, `STUDENT` and request state
- strict consumption of the official backend contract, with no parallel rules
- explicit support for idempotency and optimistic locking (ETag / If-Match)
- optional consumption of the backend AI endpoints when available

The result is a client that is both **operationally useful** and **architecturally aligned** with the backend.

---

## Core features

- **Angular 20 standalone SPA** with feature-based lazy routing
- **JWT authentication** with route guards (`authGuard`, `guestGuard`, `roleGuard`) and `Storage`-based session persistence
- **Academic request lifecycle management** from the UI:
  - register
  - classify
  - prioritize
  - assign
  - attend
  - close
  - cancel
  - reject
- **Operational dashboard** backed by real backend metrics
- **Catalog management** for request types and origin channels (ADMIN)
- **Business rule management** for priority decisions (ADMIN/STAFF read, ADMIN write)
- **User management** for STAFF/ADMIN accounts (ADMIN)
- **Reporting** and operational metrics (ADMIN)
- **Optional AI consumption** via the backend (`suggest-classification`, `summarize/{requestId}`)
- **Centralized 401 handling** via a global HTTP interceptor (`httpErrorInterceptor`) with redirect to login + safe `returnUrl`
- **`application/problem+json` normalization** through the injectable `ProblemErrorMapper`, consumed explicitly by each feature

---

## Design philosophy

This codebase follows a few non-negotiable principles.

### 1. The backend rules

Every domain rule (transitions, validations, permissions) lives in the official backend. The SPA reflects availability per role and state, but **does not** reimplement the final rule.

### 2. Contract first

The official backend defines the authoritative contract. Any change is propagated to the agreed contract first and to the client second.

### 3. Adapters per feature

Raw backend DTOs never cross into components. Each feature owns an `adapters/` folder that translates network DTO ⇄ view model.

### 4. Standalone and signals first

Standalone components, native control flow (`@if`, `@for`, `@defer`), `inject()`, signals, and `OnPush` by default. No legacy `NgModule`s.

### 5. AI is optional, never blocking

Backend AI endpoints enrich workflows. A `503 Service Unavailable` is an expected functional case, not an SPA crash.

### 6. Testable by layers

Vitest for units, Playwright for real E2E flows against the Angular dev server. ESLint with `--max-warnings=0` and a strict typecheck are mandatory gates.

---

## Architecture overview

```text
            Browser (Angular 20 SPA)
                     │
                     ▼
   src/app/features/* (standalone components, lazy)
                     │
                     ▼
       src/app/features/<feature>/data-access + adapters
        (feature-owned HTTP services and view-model mapping)
                     │
                     ▼
        src/app/core/http (interceptors)
   apiBaseUrl  →  auth  →  http-error / problem+json
                     │
                     ▼
      academic-triage-system  (`/api/v1`, JWT, ETag)
```

### Request lifecycle (mirrors the backend)

```text
REGISTERED → CLASSIFIED → IN_PROGRESS → ATTENDED → CLOSED
      │             │
      ├─────────────┴──→ CANCELLED
      └────────────────→ REJECTED
```

### Architectural consequences

- Components consume view models, not raw DTOs.
- HTTP access always flows through the `apiBaseUrl → auth → httpError` chain.
- The `apiBaseUrl` is wired through the `API_BASE_URL` token and a dedicated interceptor.
- No business data is persisted in the browser; only the session token.
- There is no embedded backend runtime in this repository (FE-060). The legacy React tree (`client/`) was removed in Phase 4 of the Angular cutover (2026-04-12).

---

## Technology stack

| Category              | Technology                                              |
| --------------------- | ------------------------------------------------------- |
| Language              | TypeScript 5.9 (strict)                                 |
| Framework             | Angular 20.3 (standalone, signals, native control flow) |
| Build / Dev server    | `@angular/build` (esbuild)                              |
| Styling               | SCSS + custom design tokens (Cyber-Classicism)          |
| State / reactivity    | Angular Signals + RxJS 7.8                              |
| HTTP                  | `provideHttpClient` with functional interceptors        |
| Routing               | Angular Router with `loadChildren` / `loadComponent`    |
| Unit testing          | Vitest 3 with V8 coverage                               |
| E2E testing           | Playwright 1.56 (Chromium)                              |
| Lint / format         | ESLint 9 + `angular-eslint` + Prettier 3                |
| Target backend        | `academic-triage-system` via `/api/v1`                  |

> Note: this SPA does **not** use Tailwind CSS. The whole visual system is built on SCSS and design tokens defined in `src/styles.scss`.

---

## Repository structure

```text
academic-triage-frontend/
├── src/
│   ├── app/
│   │   ├── core/
│   │   │   ├── auth/        # session store, guards (auth, guest, role)
│   │   │   ├── config/      # env.ts, apiBaseUrl resolver
│   │   │   └── http/        # interceptors, problem+json mappers, return-url
│   │   ├── features/
│   │   │   ├── auth/        # login, register, auth-api service
│   │   │   ├── business-rules/
│   │   │   ├── catalogs/
│   │   │   ├── dashboard/
│   │   │   ├── layout/      # app-shell, sidebar, topbar
│   │   │   ├── public-home/
│   │   │   ├── reports/
│   │   │   ├── requests/    # pages, components, adapters, data-access
│   │   │   └── users/
│   │   ├── shared/          # cross-feature ui, pipes, models, utils, data-access
│   │   ├── app.config.ts    # bootstrap providers (router, http, interceptors)
│   │   ├── app.ts           # root `at-root` component
│   │   └── routes.ts        # top-level routes and guards
│   ├── environments/        # environment.ts / environment.prod.ts
│   ├── index.html
│   ├── main.ts
│   └── styles.scss          # design tokens + base styles
├── e2e/                     # Playwright specs (public-home, role-access, helpers)
├── public/                  # static assets (favicon, etc.)
├── angular.json
├── eslint.config.js
├── playwright.config.ts
├── proxy.conf.json          # dev proxy: /api → http://localhost:8080
├── vitest.config.ts
├── tsconfig.json / tsconfig.app.json / tsconfig.spec.json
├── .nvmrc                   # Node 22 LTS pin
└── package.json
```

External references kept outside this repo:

- Backend Swagger UI — `http://localhost:8080/swagger-ui.html` (with the backend `dev` profile)

---

## Getting started

### Prerequisites

Install the following before running the project:

- Node.js **22 LTS** (pinned via `.nvmrc` and `package.json#engines`; run `nvm use` from the repo root)
- npm 10+
- The official [`academic-triage-system`](../academic-triage-system) backend running at `http://localhost:8080`

Optional but useful:

- Angular CLI globally (`npm i -g @angular/cli`) — not strictly required, an `npm run ng -- ...` script is available
- `curl`
- A devtools-enabled browser (Chromium recommended for Playwright)

---

### Run locally

1. **Clone the repository**

```bash
git clone <repo-url>
cd academic-triage-frontend
```

2. **Install dependencies**

```bash
npm install
```

3. **Start the dev server**

```bash
npm run dev
# or, equivalently
npm run start
```

The Angular dev server becomes available at `http://localhost:4200`. The vendored `proxy.conf.json` (declared in `angular.json`) forwards every request matching `/api` to `http://localhost:8080`, so `npm run dev` is enough — no flags or extra config required.

4. **Build for production**

```bash
npm run build
```

The build applies the `fileReplacements` defined in `angular.json` and swaps `environment.ts` for `environment.prod.ts`. Output is written to `dist/`.

---

### Run against the official backend

1. Start the official backend (`academic-triage-system`) on port `8080` following its own README.
2. Verify the API responds at `http://localhost:8080/api/v1` (Swagger UI available at `http://localhost:8080/swagger-ui.html` with `APP_DOCS_ENABLED=true` or the `dev` profile).
3. Start the SPA with `npm run dev` and open `http://localhost:4200`.

#### CORS

- The browser loads the SPA from `http://localhost:4200` and requests target `/api/v1/...`.
- In development, the **Angular CLI proxy** prevents CORS issues by forwarding requests to the backend on `8080`.
- If your setup disables the proxy, the official backend must explicitly allow the `http://localhost:4200` origin.

#### Local credentials (backend `dev` profile)

The official backend, started with `SPRING_PROFILES_ACTIVE=dev`, ships a demo dataset:

- `admin` / `admin123`
- demo users (`staff_registro`, `staff_admisiones`, `staff_financiero`, `staff_bienestar`, `staff_homologa`, `ana_martinez`, `juan_perez`, …) / `admin123`

These credentials only exist in the local backend `dev` profile; do not enable them in shared environments.

---

## Environment configuration

The SPA is driven by two environment files and a development proxy.

| File / variable                                     | Purpose                                                                     |
| --------------------------------------------------- | --------------------------------------------------------------------------- |
| `src/environments/environment.ts`                   | Development environment. `apiBaseUrl: '/api/v1'` (relative path + proxy).   |
| `src/environments/environment.prod.ts`              | Production environment. Same `/api/v1` path under same-origin reverse proxy.|
| `src/app/core/config/env.ts`                        | Resolves `apiBaseUrl` and exposes it through `getApiBaseUrl()`.             |
| `src/app/core/http/api-base-url.token.ts`           | Angular `API_BASE_URL` token injected in `app.config.ts`.                   |
| `angular.json`                                      | Declares the CLI proxy used by `ng serve`.                                  |

### Production topology

The confirmed topology is **same-origin reverse proxy** over `/api/v1`. Any move to a separate origin must be addressed as a deliberate change; do not rewrite `environment.prod.ts` ad-hoc.

> **Important:** this repository does **not** ship an embedded backend and does **not** maintain a mock that duplicates the contract. The only valid source for the API is the official backend.

---

## Idempotency & concurrency contract

The backend enforces strict idempotency and optimistic-locking controls. The SPA must converge to these controls; the binding details live in the backend repository.

Backend contract (what the SPA must produce):

- **Mutations (`POST`, `PATCH`):** the SPA must generate and persist an `Idempotency-Key` (UUIDv4) per logical operation attempt. If a request fails by timeout, retrying with the same key returns `Idempotency-Status: fresh` or `replayed`.
- **Administrative updates (`PUT`, `DELETE`):** first a `GET` reads the `ETag` header, and that value must be sent in `If-Match` when modifying the resource (Optimistic Locking).
- **AI cache:** `GET /api/v1/ai/summarize/{requestId}` is cached by the request version (ETag): if the request hasn't changed, the response is instantaneous.

Common errors the UI must handle as functional cases:

| Code   | Meaning                                                                                              |
| ------ | ---------------------------------------------------------------------------------------------------- |
| `409`  | Business rule violation or duplicated resource.                                                      |
| `412`  | Stale `If-Match`: the resource was modified by someone else; the SPA must refresh and retry.         |
| `422`  | Semantic validation failure or body mismatch against a previous `Idempotency-Key`.                   |
| `428`  | Missing `If-Match` on an administrative operation that requires it.                                  |
| `503`  | AI unavailable: expected case, not a crash.                                                          |

> **Implementation status:** the SPA does **not** currently send `Idempotency-Key` on mutations nor `If-Match` on administrative updates. There is no global interceptor that injects these headers yet; today only the 401 flow is centralized in `httpErrorInterceptor`. Closing this gap is tracked as pending work and must be addressed through a dedicated OpenSpec change — do not assume the contract is satisfied end-to-end until that lands.

---

## Testing

### npm commands

| Command                    | Use                                                                          |
| -------------------------- | ---------------------------------------------------------------------------- |
| `npm run dev` / `start`    | Angular dev server (`ng serve academic-triage-spa`).                         |
| `npm run build`            | Production build (`ng build academic-triage-spa`).                           |
| `npm run check`            | Typecheck of the Angular source (`tsc -p tsconfig.app.json --noEmit`).       |
| `npm run lint`             | ESLint Angular + TypeScript with `--max-warnings=0`.                         |
| `npm run lint:fix`         | ESLint with autofix.                                                         |
| `npm run format`           | Prettier write across the repo.                                              |
| `npm run format:check`     | Prettier in check mode.                                                      |
| `npm run test:unit`        | Vitest unit tests (`vitest run`).                                            |
| `npm run test:unit:watch`  | Vitest in watch mode.                                                        |
| `npm run test:e2e`         | Playwright E2E (starts the dev server if not already running).               |
| `npm run test:e2e:ui`      | Playwright in interactive UI mode.                                           |
| `npm run ng -- <cmd>`      | Angular CLI for scaffolding and ad-hoc commands.                             |

### Unit coverage (Vitest)

`vitest.config.ts` uses the `v8` provider and emits the `text` and `html` reporters. The `coverage/` folder is generated when running Vitest with `--coverage`.

### E2E (Playwright)

`playwright.config.ts`:

- runs against the `chromium` browser
- uses `http://127.0.0.1:4200` as the `baseURL`
- automatically starts `npm run start:angular -- --host 127.0.0.1 --port 4200` if no dev server is active
- writes the HTML report to `playwright-report/`

Active specs:

- `e2e/public-home.spec.ts`
- `e2e/role-access.spec.ts`
- `e2e/helpers.ts` (shared helpers)

### Lint and typecheck as gates

- `npm run lint` must end with `0 warnings` (configured in `eslint.config.js` and the script's `--max-warnings=0`).
- `npm run check` runs the strict typecheck defined in `tsconfig.app.json` (Angular `strictTemplates`, `strictInjectionParameters`).

---

## API documentation

- **Backend Swagger UI:** `http://localhost:8080/swagger-ui.html` (with `APP_DOCS_ENABLED=true` or the backend `dev` profile)

The backend is the source of truth for the SPA: when it changes, the contract is updated first and the client second.

---

## Security model

Authentication is JWT-based and stateless. The token is held in `Storage` through `auth-session.storage.ts` and injected into every request by the core `authInterceptor`.

### Supported roles

- `ADMIN`
- `STAFF`
- `STUDENT`

### Route availability per role

| UI area                            | Route                 | Guard / required role                |
| ---------------------------------- | --------------------- | ------------------------------------ |
| Public home                        | `/`                   | public                               |
| Login / Register                   | `/auth/...`           | `guestGuard`                         |
| Authenticated shell                | `/app`                | `authGuard`                          |
| Dashboard                          | `/app/dashboard`      | `authGuard`                          |
| Requests (list/detail/create)      | `/app/requests/...`   | `authGuard` + per-state/role rules   |
| Catalogs                           | `/app/catalogs`       | `roleGuard` with `ADMIN`             |
| Business rules                     | `/app/business-rules` | `roleGuard` with `ADMIN`, `STAFF`    |
| Users                              | `/app/users`          | `roleGuard` with `ADMIN`             |
| Reports                            | `/app/reports`        | `roleGuard` with `ADMIN`             |

> Final permission authority always lives on the backend. `roleGuard` prevents rendering unreachable UI but does not replace remote verification.

---

## Operational validation

The SPA has been validated across the following layers:

- strict typecheck (`npm run check`)
- ESLint Angular + TS with zero warnings (`npm run lint`)
- Vitest unit tests — **337 tests** across `core/auth`, `core/http`, every feature page (auth, requests, users, business-rules, catalogs, reports), and shared UI primitives (`loading-state`, `state-badge`)
- Playwright E2E — `public-home`, full `role-access` matrix for ADMIN/STAFF/STUDENT
- local startup against the official `academic-triage-system` at `http://localhost:8080/api/v1`

Manually validated flows:

- registration and login with session persistence
- request creation, classification, prioritization, assignment, attention, closure, cancellation, and rejection
- catalogs and business rules (read/write per role)
- STAFF/ADMIN user management
- dashboard and reports against real backend data on the `dev` profile
- AI consumption (`suggest-classification`, `summarize`) with `503` handled as an expected case

---

## Project status

This repository is currently in a **fully runnable and manually validated frontend state**, paired with the official backend.

What is already working:

- Angular 20 standalone SPA, lazy-loaded per feature, with `withPreloading(PreloadAllModules)` and view transitions scoped to the main outlet
- strict consumption of the official backend via `/api/v1`
- per-role guards and routing
- full request management lifecycle
- catalogs, business rules, users, and reports
- centralized 401 handling and `application/problem+json` normalization
- optional AI consumption with deterministic `503` handling
- consistent UX patterns across the app: panel-style filter bars with active-filter chip and disabled "Sin filtro", URL-driven list state (filters and pagination), stale-while-revalidate on table reloads, delayed-show skeletons for first loads, view-toggle (chart / table) on report sections plus podium for top responsibles
- sticky sidebar layout (`height: 100dvh`) with main scroll, mercury-bordered primary buttons, monogram avatars, and a Cyber-Classicism dark theme driven by SCSS tokens
- mandatory lint, typecheck, unit, and E2E gates

Pending / planned:

- `Idempotency-Key` injection on `POST` / `PATCH` mutations
- `If-Match` propagation on administrative `PUT` / `DELETE` (Optimistic Locking)
- a global error interceptor that normalizes `application/problem+json` for every component

---

If you are reviewing or extending this project, start with:

1. `src/app/routes.ts` and `src/app/app.config.ts`
2. `README.md` (this document)
3. The companion backend repository for the live API.

That path gives you the runtime model, the developer workflow, and the integration rules in the right order.
