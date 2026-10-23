# Runnelo UI

**A workspace-aware console for defining, running, and inspecting data jobs.**

Runnelo UI combines workflow editing, run inspection, SQL queries, and
administration. Development uses browser mocks until the new backend contract
is available.

## What it covers

- **Studio:** manage workflows and SQL, Shell, Spark, and Flink tasks; edit
  workflow graphs in the DAG editor.
- **Runs:** inspect workflow execution history, details, status, and logs.
- **Query:** write and run SQL, then inspect and export results.
- **Dashboard:** view an operational overview of jobs and runs.
- **Administration:** manage resources, users, workspaces, data sources,
  configuration, and alert rules; inspect audit logs.

The UI supports English and Chinese. Mock responses demonstrate the screens;
they do not define the future backend API.

## Quick start

Use Node.js **22.12 or later** and npm:

```bash
npm ci
npm run dev
```

Open the URL printed by Vite. With the repository defaults, development starts
in **mock mode**; MSW serves the UI without a backend.

See [.env.example](.env.example) for local mock settings. Put overrides in
`.env.local`, which Git ignores.

## How it fits together

The React app uses Ant Design, hash routing, TanStack Query for server state,
and Zustand for client state. `src/api/` exposes UI operations; `src/mocks/`
provides development responses. Some API code still reflects an older backend
and will be replaced when the new contract is known.

For styling rules, read the [UI system](docs/architecture/ui-system.md).

### Future backend integration

`VITE_API_BASE_URL` sets the request base URL; it does not change endpoint
paths, headers, payloads, or response parsing. If the new backend differs,
update `src/api/`, `src/utils/request.ts`, and the mocks.
Staging and production request settings remain provisional until integration.

## Development checks

| Command                | Purpose                                          |
| ---------------------- | ------------------------------------------------ |
| `npm run lint`         | Check source with ESLint.                        |
| `npm test`             | Run the Vitest suite once.                       |
| `npm run build`        | Type-check and create the production build.      |
| `npm run format:check` | Check source formatting without rewriting files. |

GitHub CI runs `npm ci`, lint, tests, and the production build on pull requests
and pushes to `main` or `master`. Run `npm run format:check` locally as part of
the agent workflow; it is not in CI.

## Deployment environment identity

In mock mode, `VITE_MOCK_ENV_*` settings preview an environment label, header
marker, or watermark. The UI's `GET /ui/environment` request must be checked
against the new backend contract before use outside mock mode.

## Project documentation

- [AGENTS.md](AGENTS.md) — agent workflow and document placement.
- [Code standards](docs/code-standards.md) — implementation and review rules.
- [LESSONS.md](LESSONS.md) — lessons from review and rework.
- [UI system](docs/architecture/ui-system.md) — visual direction and theme sources.
