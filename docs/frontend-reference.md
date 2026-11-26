# Academic Triage frontend reference

## Design and repository map

- **One source of domain rules.** The [backend OpenAPI contract](https://github.com/diegnghtmr/academic-triage-system/blob/main/docs/openapi-academic-triage.yaml) defines the API. Change the contract first, then the client. The browser decides what to show; the backend decides what may happen. There is no embedded backend or parallel production mock API.
- **Feature adapters.** Feature-owned HTTP services and adapters translate DTOs to view models before they reach components. Start with [routes.ts](../src/app/routes.ts) and [app.config.ts](../src/app/app.config.ts); `src/app/features/` contains auth, dashboard, requests, catalogs, business rules, users, and reports. `src/app/shared/` contains reusable UI, models, pipes, and utilities.
- **Standalone Angular.** Components use `inject()`, signals, `OnPush`, and native template control flow. Feature routes use lazy imports; Angular preloads eligible routes with `PreloadAllModules`. Router view transitions skip the initial load.
- **HTTP boundaries.** The interceptor order is API base URL → authentication → idempotency key → HTTP errors. `ProblemErrorMapper` normalizes `application/problem+json` where a feature requests it. This is not global normalization of every backend error. Optional AI `503` responses are handled without blocking ordinary request actions.
- **UI state.** List filters and pagination can be represented in route query parameters. Filter bars show an active-filter chip; “Sin filtro” is disabled when no filter is active. Lists retain old rows while refreshing; loading placeholders use a delay. Reports offer chart/table views and show a podium for the leading assignees. The [SCSS tokens](../src/styles.scss) drive the Cyber-Classicism dark theme; Tailwind is not used. The shell uses a viewport-height sidebar and scrolls the main panel.

`src/app/core/auth/`, `src/app/core/config/`, and `src/app/core/http/` hold session/guards, runtime API configuration, and interceptors. `src/main.ts` bootstraps the `at-root` application with [app.config.ts](../src/app/app.config.ts). `public/` ships static assets including the favicon; no legacy React `client/` tree is shipped.

## Security and routing

The [auth session store](../src/app/core/auth/auth-session.store.ts) persists the JWT and user in `localStorage`; it does not persist requests or report data. The authentication interceptor adds the bearer token to authenticated API requests. A `401` clears the session and sends the browser to login with a safe return URL. Guards are a navigation convenience, not a substitute for API authorization.

| Area | Routes | Browser gate |
| --- | --- | --- |
| Public home | `/` | None |
| Sign in and register | `/auth/login`, `/auth/register` | Guest guard |
| Shell and dashboard | `/app`, `/app/dashboard` | Signed-in `ADMIN`, `STAFF`, or `STUDENT` |
| Requests | `/app/requests/list`, `/app/requests/new`, `/app/requests/:requestId` | Signed-in; individual actions depend on role and request state |
| Catalogs | `/app/catalogs` | `ADMIN` |
| Business rules | `/app/business-rules` | `ADMIN`, `STAFF`; create/edit is `ADMIN` only |
| Users and reports | `/app/users`, `/app/reports` | `ADMIN` |

## Request states and concurrency

The normal lifecycle is `REGISTERED → CLASSIFIED → IN_PROGRESS → ATTENDED → CLOSED`. A registered request can also be cancelled or rejected; a classified request can be cancelled. Actor permissions and additional conditions come from the backend. Closed, cancelled, and rejected requests cannot be reopened through the workflow.

- For mutations, the interceptor supplies an `Idempotency-Key` when one is missing. It uses `crypto.randomUUID()` when available. For a manual retry of the same logical operation after a timeout, provide the original key; the interceptor preserves it. A newly initiated request is not guaranteed to reuse the earlier key. Supported operations return `Idempotency-Status: fresh` or `replayed`.
- When an administrative endpoint requires `If-Match`, read the resource's `ETag` with a `GET` and send that exact value on the subsequent write. The frontend does not currently implement this exchange. After `412`, refresh before deciding whether to retry. If using a cross-origin integration, check that the browser is allowed to read `ETag` as well as send `If-Match`; the backend's current CORS config does not expose `ETag`.
- `409` indicates a conflict; `422` can mean failed semantic validation or reuse of a key with a different payload; `428` means a required precondition is missing. Summaries returned by the optional AI endpoint are cached by request version on the backend, not in the browser.

## Deployment and API reference

In development, [environment.ts](../src/environments/environment.ts) selects `/api/v1`; [angular.json](../angular.json) enables the checked-in [proxy](../proxy.conf.json) for development serving. The [environment resolver](../src/app/core/config/env.ts) and `API_BASE_URL` token supply the base to the interceptor.

Production builds replace that file with [environment.prod.ts](../src/environments/environment.prod.ts), which currently points at the separate Render API origin. Allow the deployed frontend origin in the backend's `APP_CORS_ALLOWED_ORIGINS`. A same-origin installation would instead require a relative production API base and an external reverse proxy; the Angular development proxy is not shipped with the build.

For local exploration, use [Swagger UI](http://localhost:8080/swagger-ui.html) with the backend `dev` profile, or enable docs explicitly on the backend. Outside disposable local development, do not enable the seeded demo accounts.

## Developer commands and validation

| Command | Purpose |
| --- | --- |
| `npm run dev` / `npm run start` | Serve the Angular app with the local API proxy. |
| `npm run build` | Produce the production build under `dist/`. |
| `npm run check` | Run `tsc -p tsconfig.app.json --noEmit`; Angular template diagnostics also run in `npm run build`. |
| `npm run lint` / `npm run lint:fix` | Check Angular and TypeScript with zero allowed warnings, or apply ESLint fixes. |
| `npm run format:check` / `npm run format` | Check or rewrite formatting with Prettier. |
| `npm run test:unit` / `npm run test:unit:watch` | Run Vitest once or in watch mode. |
| `npm run test:unit -- --coverage` | Use V8 coverage with text and HTML reports in `coverage/`. |
| `npm run test:e2e` / `npm run test:e2e:ui` | Run Playwright or launch its interactive UI. |
| `npm run ng -- <command>` | Invoke the local Angular CLI without a global install. |

[Playwright](../playwright.config.ts) starts Chromium against `http://127.0.0.1:4200` and launches the development server if needed. It emits an HTML report in `playwright-report/`. The [public-home spec](../e2e/public-home.spec.ts) and [role-access spec](../e2e/role-access.spec.ts) exercise the browser, with API responses intercepted where needed; they do not prove a live backend integration.

For a separate live-stack check, start the `dev` API and verify sign-in/session restoration, student intake, the staff classification-to-closure flow, allowed cancellation/rejection, and administrator catalogs, rules, users, and reports. Include an optional AI call and the provider-disabled `503` path. Verify `If-Match` endpoints through the API separately until the browser supports them. These are manual check steps, not a certification of the current build.
