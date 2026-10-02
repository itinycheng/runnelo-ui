# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start Vite dev server (MSW mocks auto-enabled)
npm run build        # TypeScript check + Vite production build
npm run lint         # ESLint validation
npm run format       # Prettier formatting (src/**/*.{ts,tsx,css,json})
npm run test         # Run tests once (vitest run)
npm run test:watch   # Run tests in watch mode
npm run preview      # Preview production build
```

To run a single test file:

```bash
npx vitest run src/path/to/file.test.ts
```

## Architecture Overview

**Runnelo** is a workflow/job management UI for Flink/Spark/SQL jobs. It uses React 19, Ant Design 6, React Router 7, and Zustand for client state.

### Routing & Auth

- `src/router/index.tsx` — HashRouter with protected routes wrapped in `MainLayout` + `AuthGuard`; hash routing keeps refreshes compatible with the backend's unchanged static-resource handling
- `AuthGuard` checks token from `authStore`; redirects to `/login` or `/403` based on auth/permissions
- Routes: `/dashboard`, `/studio`, `/query`, `/runs`, `/admin/*`, `/audit-logs`

### State Management

- TanStack Query owns remote/server state and cache keys include the active workspace.
- Zustand stores in `src/stores/` own client/session state:
- **`authStore`** — token + user, persisted to localStorage; login/logout via `api/auth.ts`
- **`jobStore`** — job tree, open tabs, selected node; lazy-loads group children; manages workflow CRUD

### Studio Module (`src/pages/Studio/`)

The most complex module — a VS Code-like IDE layout:

- **`index.tsx`** — Two-pane layout: left Sider + right tab area
- **`Sider.tsx`** — Activity bar with 4 panels: Tree, Search, Errors, Trash (240px wide when active)
- **`JobTree.tsx`** — Hierarchical tree of groups/jobs; lazy loads children; context menu actions
- **`DAGEditor.tsx`** — XYFlow-based DAG editor for visualizing/editing workflow graphs
- **`JobTabWrapper/`** — Wraps DAGEditor (workflows) or JobForm (tasks); side drawer for Schedule + Params
- **`tasks/`** — Per-type task forms: `SqlForm`, `ShellForm`, `SparkForm`, `FlinkForm`; `registry.ts` maps types to forms

### API Layer

- `src/utils/request.ts` — Axios instance with a configurable base URL and 30s timeout; request interceptor adds the legacy `X-Token` and `X-Workspace-Id` headers.
- `src/api/legacy/` isolates DTO/status/date conversion for the existing backend.
- See `docs/backend-compatibility.md` before changing endpoints or DTOs.

### Configuration & Environments

Per-environment values live in Vite env files (`.env` shared defaults, plus `.env.development` / `.env.staging` / `.env.production`; `.env.example` documents every var, `.env.local` is git-ignored). All `VITE_`-prefixed vars are read through one module — **`src/config/index.ts`** (`API.baseURL`, `API.timeout`, `ENABLE_MOCK`, `APP.name/version`) — so nothing reaches into `import.meta.env` or hardcodes literals directly. Env var types are declared in `src/vite-env.d.ts`.

localStorage keys are centralized in **`src/constants/storage.ts`** (`STORAGE_KEYS`) — the request interceptor and the owning stores share them instead of duplicating string literals.

Builds: `npm run build` (production), `npm run build:stage` (staging mode). Set `VITE_API_PROXY` in `.env.local` to develop against a real backend — Vite proxies `VITE_API_BASE_URL` to it and mocks turn off automatically.

### Dev Mocking (MSW)

MSW is started in dev when `ENABLE_MOCK` is true (`main.tsx`); it's gated on `import.meta.env.DEV` so production builds tree-shake the worker out. Handlers live in `src/mocks/handlers/`. Unhandled requests bypass to the real network (`onUnhandledRequest: "bypass"`).

### i18n

- `src/i18n.ts` — i18next setup; default lang: English
- Translations in `src/locales/en.ts` and `src/locales/zh.ts`
- Active language is controlled by i18next and persisted by `src/i18n.ts`; Ant Design locale also switches via `App.tsx`

### Path Aliases

`@` maps to `./src` (configured in both `vite.config.ts` and `tsconfig.json`).

### Global Defines

`__APP_NAME__` and `__APP_VERSION__` are injected at build time from `package.json` (surfaced via `APP` in `src/config`).

### Testing

- Vitest with jsdom environment; globals enabled
- Setup file: `src/test/setup.ts`
- Test pattern: `src/**/*.{test,spec}.{ts,tsx}`
