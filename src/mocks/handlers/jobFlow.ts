import { http as mswHttp, delay, type RequestHandler } from "msw";
import { fail, ok } from "@/mocks/lib/response";
import { jobTreeStore, recordPlacement } from "@/mocks/data/jobTree";
import { ensureMockJobsForFlow } from "@/mocks/handlers/job";
import type { JobFlow, JobFlowDag } from "@/types/entities";
import { ipage, parsePageSize } from "@/mocks/lib/page";

// In-memory store, mirrors the backend /jobFlow endpoints for mock-only dev.
const store = new Map<number, JobFlow>();
let seq = 2000;

function numId(idParam: string): number {
  return Number(idParam);
}

/** Get-or-synthesize a stored flow so subsequent updates/reopens see the same object. */
function isSeededWorkflow(id: number): boolean {
  return [...jobTreeStore.values()].some((node) => node.kind === "workflow" && node.refId === id);
}

function demoDag(flowId: number): JobFlowDag {
  const jobs = ensureMockJobsForFlow(flowId);
  return {
    vertices: jobs.map((job, index) => ({ id: index + 1, jobId: job.id!, precondition: "ALL_MATCHED" })),
    edges: jobs.slice(1).map((_, index) => ({
      fromVId: index + 1,
      toVId: index + 2,
      expectStatus: "SUCCESS",
    })),
    nodeLayouts: Object.fromEntries(
      jobs.map((_, index) => [index + 1, { id: String(index + 1), type: "taskNode", x: 120 + index * 240, y: 120 }]),
    ),
    edgeLayouts: Object.fromEntries(jobs.slice(1).map((_, index) => [index, { id: `edge-${index + 1}-${index + 2}` }])),
  };
}

function ensureFlow(id: number, includeDemoGraph = false): JobFlow {
  let flow = store.get(id);
  if (!flow) {
    flow = defaultFlow(id);
    store.set(id, flow);
  }
  if (includeDemoGraph && flow.flow == null && isSeededWorkflow(id)) {
    flow.flow = demoDag(id);
  }
  return flow;
}

function defaultFlow(id: number): JobFlow {
  return {
    id,
    name: `flow-${id}`,
    type: "JOB_FLOW",
    status: "ONLINE",
    config: { parallelism: 1 },
    timeout: { enable: false },
  };
}

function allFlows(): JobFlow[] {
  const seeded = [...jobTreeStore.values()]
    .filter((node) => node.kind === "workflow")
    .map((node) => ({ ...ensureFlow(node.refId ?? numId(node.id)), name: node.name }));
  const seededIds = new Set(seeded.map((flow) => flow.id));
  return [...seeded, ...[...store.values()].filter((flow) => !seededIds.has(flow.id))];
}

export const jobFlowHandlers: RequestHandler[] = [
  mswHttp.get("/api/jobFlow/page", async ({ request }) => {
    await delay(100);
    const url = new URL(request.url);
    const { page, size } = parsePageSize(url);
    const name = url.searchParams.get("name")?.toLowerCase();
    const rows = allFlows().filter((flow) => !name || flow.name.toLowerCase().includes(name));
    return ok(ipage(rows, page, size));
  }),

  mswHttp.get("/api/jobFlow/idNameMapList", async ({ request }) => {
    await delay(100);
    const name = new URL(request.url).searchParams.get("name")?.toLowerCase();
    return ok(
      allFlows()
        .filter((flow) => flow.status !== "DELETE" && (!name || flow.name.toLowerCase().includes(name)))
        .map(({ id, name: flowName }) => ({ id, name: flowName })),
    );
  }),

  mswHttp.post("/api/jobFlow/create", async ({ request }) => {
    await delay(200);
    const { groupId, ...body } = (await request.json()) as JobFlow & { groupId?: string };
    const id = ++seq;
    store.set(id, { ...body, id, status: "OFFLINE" });
    if (groupId) {
      recordPlacement({
        id: String(id),
        name: body.name,
        kind: "workflow",
        refId: id,
        pid: groupId,
        status: "pending",
        lifecycleStatus: "OFFLINE",
        tags: [],
      });
    }
    return ok(id, { status: 201 });
  }),

  mswHttp.post("/api/jobFlow/update", async ({ request }) => {
    await delay(200);
    const body = (await request.json()) as JobFlow;
    const id = body.id!;
    store.set(id, { ...(store.get(id) ?? {}), ...body });
    return ok(id);
  }),

  mswHttp.get("/api/jobFlow/get/:id", async ({ params }) => {
    await delay(150);
    const id = numId(params.id as string);
    return Number.isFinite(id) ? ok(ensureFlow(id, true)) : fail(1001, "工作流 ID 必须是数字");
  }),

  mswHttp.get("/api/jobFlow/copy/:id", async ({ params }) => {
    await delay(200);
    const src = ensureFlow(numId(params.id as string), true);
    const id = ++seq;
    store.set(id, { ...src, id, name: `${src.name}-copy` });
    return ok(id);
  }),

  mswHttp.get("/api/jobFlow/schedule/start/:id", async ({ params }) => {
    await delay(150);
    const flow = ensureFlow(numId(params.id as string));
    flow.status = "SCHEDULING";
    return ok(flow.id);
  }),

  mswHttp.get("/api/jobFlow/schedule/stop/:id", async ({ params }) => {
    await delay(150);
    const flow = ensureFlow(numId(params.id as string));
    flow.status = "ONLINE";
    return ok(flow.id);
  }),

  mswHttp.post("/api/jobFlow/schedule/runOnce/:id", async () => {
    await delay(200);
    return ok(++seq); // fake flowRunId
  }),

  mswHttp.post("/api/jobFlow/updateFlow", async ({ request }) => {
    await delay(200);
    const body = (await request.json()) as { id: string | number; flow: unknown };
    const flow = ensureFlow(numId(String(body.id)));
    // New-UI FlowGraph stored on the flow's `flow` field (backend accepts both shapes).
    (flow as { flow?: unknown }).flow = body.flow;
    return ok(flow.id);
  }),

  mswHttp.get("/api/quartz/parseExpr", async ({ request }) => {
    await delay(100);
    const cron = new URL(request.url).searchParams.get("cron") ?? "";
    if (cron.split(/\s+/).length < 6) return fail(1001, "Invalid cron expression");
    return ok(["2026-09-28 00:00:00", "2026-09-29 00:00:00"]);
  }),
];
