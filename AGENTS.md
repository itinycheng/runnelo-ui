# Notes for coding agents

Agents implement and verify changes; the owner reviews the diff and UI.
Proceed on routine implementation decisions without waiting for approval.

## Start here

1. Read [LESSONS.md](LESSONS.md) and relevant
   [code standards](docs/code-standards.md).
2. For UI work, read [the UI system](docs/architecture/ui-system.md). For
   data behavior, trace the UI-facing API, types, and MSW handlers.
3. Check claims against source code. Preserve unrelated changes; use separate
   worktrees for concurrent coding sessions.

## Project map

- React 19, TypeScript, Vite, Ant Design 6, React Router 7, TanStack Query,
  Zustand, i18next, XYFlow, MSW, and Vitest form the UI stack.
- `src/router/` owns hash routing and access guards. `src/pages/Studio/`
  owns the definition tree, task forms, tabs, and DAG editor.
- TanStack Query owns server state; workspace-scoped query keys include the
  active workspace (`src/api/queryKeys.ts`). Zustand stores in `src/stores/`
  own client/session state. For workspace-sensitive data, check
  `src/stores/workspaceStore.ts` and request headers in `src/utils/request.ts`.
- `src/api/` exposes UI operations. `src/api/legacy/` and some API functions
  reflect an older backend, not the future contract. Keep pages and stores
  independent of transport DTOs.
- `src/config/index.ts` reads Vite environment values. `src/theme.ts` owns
  Ant Design and ProLayout themes; `src/constants/layout.ts` owns shared
  page spacing. Translations live in `src/locales/`.
- `src/mocks/handlers/` and `src/mocks/data/` supply development behavior.
  The new backend contract is unavailable; do not assume existing endpoints
  or shapes are its contract.

## Development workflow

`npm run dev` uses MSW mocks with the default environment files; check
`.env.local` for overrides. No backend is required in mock mode.

1. Define the user-visible outcome and trace the relevant UI, state, API,
   and tests. Keep the change focused.
2. Follow existing boundaries. When changing fetched data, update the
   UI-facing API and relevant mock handlers/data together. Test important
   logic and regressions per [code standards](docs/code-standards.md).
3. Run focused checks while developing. For code changes, run and report:

   ```bash
   npm run format:check
   npm run lint
   npm test
   npm run build
   ```

4. Hand off three items: **Changed** (behavior and screens), **Checked**
   (commands, results, and checks not run), and **Review** (UI path and any
   remaining assumption). Routine work needs no screenshots or UI automation.

The owner controls merge and deployment. Agents may write CI/CD scripts but
do not start publishing or deployment during routine work.

## Documentation placement

| Material                       | Location                                               | Lifetime                                 |
| ------------------------------ | ------------------------------------------------------ | ---------------------------------------- |
| Agent rules and code standards | `AGENTS.md`, `docs/code-standards.md`                  | Maintain with code.                      |
| Review lessons                 | `LESSONS.md`                                           | Promote recurring rules.                 |
| Implemented architecture       | `docs/architecture/`                                   | Verify against source; update with code. |
| Accepted designs and plans     | `docs/plans/YYYY-MM-DD-topic-design.md`, `...-plan.md` | Remove after extracting durable facts.   |
| Repeatable test procedures     | `docs/testing/`                                        | Create when needed.                      |
| Unit tests                     | Beside source                                          | Keep with tested behavior.               |
| One-off logs and screenshots   | Handoff or temporary files                             | Do not commit as current documentation.  |

Small tasks need no plan file. Create directories only when needed. Architecture
documents describe implemented behavior; plans describe proposals. Verify
AI-generated documentation against code before treating it as current.
