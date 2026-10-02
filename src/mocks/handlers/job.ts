import { http, delay, type RequestHandler } from "msw";
import { ok, fail } from "@/mocks/lib/response";
import {
  jobTreeStore,
  listRoots,
  listChildren,
  searchTree,
  createGroupRow,
  renameGroupRow,
  deleteGroupSubtree,
  recordPlacement,
  renameLeaf,
  deleteLeaf,
} from "@/mocks/data/jobTree";
import type { JobInfo } from "@/types/entities";
import type { JobType } from "@/constants/enums";
import { ipage, parsePageSize } from "@/mocks/lib/page";

// ---- Seed data generated with faker ----
// Tree seeding (job_group + job_tree stores) now lives in `@/mocks/data/jobTree`.

// ---- JobInfo (backend-shaped task entity) store ----

const jobInfoStore = new Map<number, JobInfo>();
let jobInfoSeq = 1000;

function defaultConfig(type: JobType) {
  const base = { type, retryTimes: 0, retryInterval: "5s" };
  if (type === "SHELL") return { ...base, timeout: "60s" };
  if (type === "MYSQL_SQL" || type === "HIVE_SQL" || type === "CLICKHOUSE_SQL") return { ...base, dsId: 1 };
  return base;
}

function defaultJobInfo(id: number): JobInfo {
  return {
    id,
    name: `job-${id}`,
    type: "MYSQL_SQL",
    execMode: "BATCH",
    routeUrl: [1],
    subject: "SELECT 1",
    config: defaultConfig("MYSQL_SQL") as JobInfo["config"],
    status: "ONLINE",
  };
}

function seededJobInfos(): JobInfo[] {
  const flowIds = [...jobTreeStore.values()]
    .filter((node) => node.kind === "workflow" && node.refId != null)
    .map((node) => node.refId!);
  return [...jobTreeStore.values()]
    .filter((node) => node.kind === "task")
    .map((node, index) => ({
      ...defaultJobInfo(node.refId ?? 10_000 + index),
      name: node.name,
      type: node.jobType ?? "MYSQL_SQL",
      flowId: flowIds.length ? flowIds[index % flowIds.length] : undefined,
    }));
}

const DEMO_FLOW_TASKS: Array<Pick<JobInfo, "name" | "type" | "subject">> = [
  { name: "读取源数据", type: "MYSQL_SQL", subject: "SELECT * FROM source_table" },
  { name: "Flink 实时转换", type: "FLINK_SQL", subject: "SELECT * FROM source_stream" },
  { name: "写入数仓", type: "HIVE_SQL", subject: "INSERT INTO target_table SELECT * FROM transformed_data" },
];

/** Ensure seeded workflows always have enough stable tasks to render a useful demo DAG. */
export function ensureMockJobsForFlow(flowId: number): JobInfo[] {
  const owned = [...seededJobInfos(), ...jobInfoStore.values()].filter((job) => job.flowId === flowId);
  for (let index = owned.length; index < DEMO_FLOW_TASKS.length; index++) {
    const template = DEMO_FLOW_TASKS[index];
    const id = 1_000_000 + flowId * 10 + index;
    const job: JobInfo = {
      ...defaultJobInfo(id),
      ...template,
      id,
      flowId,
      config: defaultConfig(template.type) as JobInfo["config"],
    };
    jobInfoStore.set(id, job);
    owned.push(job);
  }
  return owned.slice(0, DEMO_FLOW_TASKS.length);
}

function findMockJobInfo(id: number): JobInfo {
  return jobInfoStore.get(id) ?? seededJobInfos().find((job) => job.id === id) ?? defaultJobInfo(id);
}

export const workflowHandlers: RequestHandler[] = [
  // Legacy backend page used by the Runnelo compatibility tree.
  http.get("/api/jobInfo/page", async ({ request }) => {
    await delay(100);
    const url = new URL(request.url);
    const { page, size } = parsePageSize(url);
    const name = url.searchParams.get("name")?.toLowerCase();
    const stored = [...jobInfoStore.values()];
    const rows = [...seededJobInfos(), ...stored].filter((job) => !name || job.name.toLowerCase().includes(name));
    return ok(ipage(rows, page, size));
  }),

  http.get("/api/jobInfo/list", async ({ request }) => {
    await delay(100);
    const flowId = Number(new URL(request.url).searchParams.get("flowId"));
    return ok(ensureMockJobsForFlow(flowId));
  }),

  // GET /api/jobTree/roots — top-level groups only (no children)
  http.get("/api/jobTree/roots", async () => {
    await delay(200);
    return ok(listRoots());
  }),

  // GET /api/jobTree/children — direct members (subgroups + leaves) of a group
  http.get("/api/jobTree/children", async ({ request }) => {
    await delay(50);
    const groupId = new URL(request.url).searchParams.get("groupId") ?? "";
    return ok(listChildren(groupId));
  }),

  // GET /api/jobTree/search — search leaves across all groups
  http.get("/api/jobTree/search", async ({ request }) => {
    await delay(200);
    const p = new URL(request.url).searchParams;
    return ok(
      searchTree({
        keyword: p.get("keyword") ?? undefined,
        types: p.get("types") ? p.get("types")!.split(",") : undefined,
        statuses: p.get("statuses") ? p.get("statuses")!.split(",") : undefined,
      }),
    );
  }),

  // POST /api/jobGroup/create — creates a top-level group (no pid) or a
  // subgroup (pid points at a top-level group). Nesting beyond one level
  // (pid pointing at a subgroup) or a nonexistent pid is rejected.
  http.post("/api/jobGroup/create", async ({ request }) => {
    await delay(150);
    const { name, pid } = (await request.json()) as { name: string; pid?: string };
    try {
      return ok(createGroupRow(name, pid ?? ""), { status: 201 });
    } catch (e) {
      const err = e as { code?: number; desc?: string };
      return fail(err.code ?? 1001, err.desc ?? "分组嵌套超过一层");
    }
  }),

  // POST /api/jobGroup/update — rename a group
  http.post("/api/jobGroup/update", async ({ request }) => {
    await delay(150);
    const { id, name } = (await request.json()) as { id: string; name: string };
    return renameGroupRow(id, name) ? ok(id) : fail(1002, "分组不存在");
  }),

  // GET /api/jobGroup/delete/:id — delete a group and cascade its subtree
  http.get("/api/jobGroup/delete/:id", async ({ params }) => {
    await delay(150);
    return ok(deleteGroupSubtree((params as { id: string }).id));
  }),

  // ---- Definition lifecycle (Task & Workflow nodes) ----
  // NOTE: run-once / status / copy now go through /jobFlow/* (see jobStore); the
  // old /jobs/:id/{run-once,status,copy} handlers were removed with their api fns.

  // POST /api/jobTree/rename — rename a leaf (task/workflow) placement
  http.post("/api/jobTree/rename", async ({ request }) => {
    await delay(150);
    const { id, name } = (await request.json()) as { id: string; name: string };
    return renameLeaf(id, name) ? ok(id) : fail(1003, "节点不存在");
  }),

  // GET /api/jobTree/delete/:id — delete a leaf placement
  http.get("/api/jobTree/delete/:id", async ({ params }) => {
    await delay(150);
    return ok(deleteLeaf((params as { id: string }).id));
  }),

  // POST /api/jobTree/tags
  http.post("/api/jobTree/tags", async ({ request }) => {
    await delay(150);
    const { id, tags } = (await request.json()) as { id: string; tags: string[] };
    const n = jobTreeStore.get(id);
    if (!n) return fail(1003, "节点不存在");
    n.tags = tags;
    return ok(n);
  }),

  // ---- JobInfo (backend-shaped task entity) ----

  // GET /api/jobInfo/get/:id — the deployed controller accepts a numeric Long.
  http.get("/api/jobInfo/get/:id", async ({ params }) => {
    await delay(150);
    const { id } = params as { id: string };
    const numericId = Number(id);
    if (!Number.isFinite(numericId)) return fail(1001, "任务 ID 必须是数字");
    return ok(findMockJobInfo(numericId));
  }),

  http.post("/api/jobInfo/getByIds", async ({ request }) => {
    await delay(100);
    const ids = (await request.json()) as number[];
    return ok(ids.map(findMockJobInfo));
  }),

  // POST /api/jobInfo/create
  http.post("/api/jobInfo/create", async ({ request }) => {
    await delay(200);
    const { groupId, ...body } = (await request.json()) as JobInfo & { groupId?: string };
    const id = ++jobInfoSeq;
    const stored: JobInfo = { ...body, id, status: "ONLINE" };
    jobInfoStore.set(id, stored);
    if (groupId) {
      recordPlacement({
        id: String(id),
        name: stored.name,
        kind: "task",
        jobType: stored.type,
        refId: id,
        pid: groupId,
        status: "pending",
        lifecycleStatus: "OFFLINE",
        tags: [],
      });
    }
    return ok(stored, { status: 201 });
  }),

  // POST /api/jobInfo/update
  http.post("/api/jobInfo/update", async ({ request }) => {
    await delay(200);
    const body = (await request.json()) as JobInfo;
    if (typeof body.id !== "number") {
      return ok(body);
    }
    const merged: JobInfo = { ...jobInfoStore.get(body.id), ...body };
    jobInfoStore.set(body.id, merged);
    return ok(merged);
  }),

  http.get("/api/jobInfo/delete/:id", async ({ params }) => {
    await delay(100);
    return ok(jobInfoStore.delete(Number((params as { id: string }).id)));
  }),
];
