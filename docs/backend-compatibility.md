# Legacy backend compatibility

This UI currently targets the existing `flink-platform-backend` API. The
backend contract stays unchanged while the React UI is rolled out alongside
the legacy Vue UI from `flink-platform-frontend`, which is included in the
backend at `flink-platform-ui/frontend` as a Git submodule.

## Boundary rules

- `src/api/*` exposes UI-oriented operations.
- `src/api/legacy/*` owns legacy DTOs and field/status conversion.
- Pages and stores must not depend directly on legacy DTOs.
- Requests use `X-Token` and `X-Workspace-Id`, matching the current backend.
- Production calls same-origin root endpoints. Development may use `/api`; the
  Vite proxy removes that development-only prefix.
- Client navigation uses hash routing so deep-link refreshes require no Spring
  MVC fallback changes.
- Existing GET mutation endpoints remain GET until both UIs can migrate
  together.
- Workspace switches remount the active route and clear workspace-scoped query
  and Studio state; they do not reload the browser page.

## Compatibility decisions

| UI capability       | Existing backend mapping                                       |
| ------------------- | -------------------------------------------------------------- |
| Definition explorer | Virtual root built from `/jobFlow/page` and `/jobInfo/page`    |
| Definition folders  | Hidden in the legacy backend; development mocks support groups |
| Workflow creation   | `/jobFlow/create` with legacy scheduling defaults              |
| Task creation       | `/jobInfo/create`; each task selects its owning `flowId`       |
| DAG composition     | Existing flow tasks from `/jobInfo/list` become vertices       |
| Flow run list       | `/jobFlowRun/page`, with legacy query parameter adaptation     |
| Flow run detail     | `/jobFlowRun/get/{id}` plus `/jobRun/page?flowRunId=...`       |
| Job log             | `backInfo` from `/jobRun/get/{id}`                             |
| Kill flow           | GET `/jobFlowRun/kill/{id}`                                    |
| Dashboard totals    | `/dashboard/jobFlowRunStatusCount`                             |
| Dashboard trend     | Hidden/empty until a time-series endpoint exists               |
| SQL execution       | `/reactive/execJob`                                            |
| Schema browser      | Empty until metadata endpoints exist                           |
| Monitor page        | Redirected to existing alert-rule management                   |
| System config       | `/config/*` with the backend's polymorphic `FLINK` payload     |

In development mock mode, the definition explorer uses the existing mock
`/jobTree/*` and `/jobGroup/*` handlers. It supports multiple root groups and
one subgroup level. The deployed legacy backend still uses one virtual
Definitions root and cannot persist group changes.

The Studio right panels are shared by workflows and tasks. Workflow settings
use `JobFlow`; task parameters use `JobInfo.params`. In mock mode, each task also
stores its own Schedule and Alerts settings on its mock `JobInfo`. The legacy
backend has no corresponding task Schedule/Alerts fields, so those two panels
show an availability notice for tasks outside mock mode.

## Authentication modes

- LOCAL submits username/password to `/login`.
- CAS callbacks read `ticket` from the browser query string.
- OIDC callbacks read `code` and `state` from the browser query string.
- Both SSO modes exchange the callback through the existing `/login` endpoint,
  then use the same local session/workspace initialization as LOCAL login.
- The requested in-app route is kept in session storage across the external
  redirect. Only relative application paths are accepted.
- Logout follows the backend-provided identity-provider redirect when present.

## Deferred backend migration

After the React UI is stable, introduce a versioned API/OpenAPI contract and
replace the compatibility implementation without changing page components.
At that point migrate unsafe GET mutations, add the `/api` prefix, expose
time-series/schema/log-tail endpoints, and remove the virtual definition tree.

## Read-only smoke test

With the backend running, verify the contract without mutating application data:

```bash
FLINK_PLATFORM_USERNAME=admin FLINK_PLATFORM_PASSWORD=... npm run test:backend
```

Set `FLINK_PLATFORM_BACKEND_URL` when the backend is not available at
`http://localhost:9104`. For SSO deployments, provide `FLINK_PLATFORM_TOKEN`
and optionally `FLINK_PLATFORM_WORKSPACE_ID` instead of a username and
password.

## Mutation smoke test

To verify create/update compatibility, run the mutation test against a local
or disposable backend. It creates a workflow, task, DAG and Flink runtime
config, verifies them, then purges only the records it created:

```bash
FLINK_PLATFORM_USERNAME=admin FLINK_PLATFORM_PASSWORD=... npm run test:backend:mutation
```
