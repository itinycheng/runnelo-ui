const baseUrl = (process.env.FLINK_PLATFORM_BACKEND_URL || "http://localhost:9104").replace(/\/$/, "");
const username = process.env.FLINK_PLATFORM_USERNAME;
const password = process.env.FLINK_PLATFORM_PASSWORD;
let token = process.env.FLINK_PLATFORM_TOKEN;
let workspaceId = process.env.FLINK_PLATFORM_WORKSPACE_ID;

async function request(path, init = {}) {
  const headers = { "Content-Type": "application/json", ...init.headers };
  if (token) headers["X-Token"] = token;
  if (workspaceId) headers["X-Workspace-Id"] = workspaceId;
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers,
    signal: AbortSignal.timeout(10_000),
  });
  const body = await response.json();
  if (!response.ok || body?.code !== 0) {
    throw new Error(
      `${init.method || "GET"} ${path}: HTTP ${response.status}, code=${body?.code}, ${body?.desc || "unknown error"}`,
    );
  }
  return body.data;
}

async function post(path, data) {
  return request(path, { method: "POST", body: JSON.stringify(data) });
}

async function authenticate() {
  if (token) return;
  if (!username || !password) {
    throw new Error("Set FLINK_PLATFORM_USERNAME and FLINK_PLATFORM_PASSWORD, or provide FLINK_PLATFORM_TOKEN.");
  }
  const login = await post("/login", {
    username,
    password,
    workspaceId: workspaceId ? Number(workspaceId) : undefined,
  });
  token = login.token;
  workspaceId ||= login.workspaceId == null ? undefined : String(login.workspaceId);
}

async function main() {
  await authenticate();
  if (!workspaceId) {
    const workspaces = await request("/workspace/list");
    workspaceId = workspaces[0]?.id == null ? undefined : String(workspaces[0].id);
  }
  if (!workspaceId) throw new Error("No workspace is available for the mutation smoke test.");

  const workers = await request("/worker/list");
  const workerId = workers[0]?.id;
  if (!workerId) throw new Error("No worker is available for creating a test task.");

  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  let flowId;
  let configId;
  try {
    flowId = await post("/jobFlow/create", {
      name: `ui-smoke-flow-${suffix}`,
      type: "JOB_FLOW",
      config: { parallelism: 1 },
      timeout: { enable: false },
    });
    const job = await post("/jobInfo/create", {
      name: `ui-smoke-task-${suffix}`,
      flowId,
      type: "SHELL",
      execMode: "BATCH",
      deployMode: "RUN_LOCAL",
      routeUrl: [workerId],
      subject: "echo ui-smoke",
      config: { type: "SHELL", retryTimes: 0, retryInterval: "5s", timeout: "60s" },
    });

    const jobs = await request(`/jobInfo/list?flowId=${flowId}`);
    if (!jobs.some((item) => item.id === job.id)) throw new Error("Created task was not returned by /jobInfo/list.");

    await post("/jobFlow/updateFlow", {
      id: flowId,
      flow: {
        vertices: [{ id: 1, jobId: job.id, precondition: "ALL_MATCHED" }],
        edges: [],
        nodeLayouts: { 1: { id: "1", type: "taskNode", x: 120, y: 80 } },
        edgeLayouts: {},
      },
    });
    const saved = await request(`/jobFlow/get/${flowId}`);
    if (saved.flow?.vertices?.[0]?.jobId !== job.id) throw new Error("Saved workflow DAG did not retain the task.");

    configId = await post("/config/create", {
      name: `ui-smoke-flink-${suffix}`,
      description: "Created by the frontend mutation smoke test",
      type: "FLINK",
      version: `smoke-${suffix}`,
      status: "DISABLE",
      config: {
        type: "FLINK",
        commandPath: "/opt/flink/bin/flink",
        jarFile: "hdfs:///flink/flink-sql-client.jar",
        className: "com.example.FlinkSqlClient",
        libDirs: "/opt/flink/lib",
      },
    });
    const savedConfig = await request(`/config/get/${configId}`);
    if (savedConfig.type !== "FLINK" || savedConfig.config?.type !== "FLINK") {
      throw new Error("Saved Flink config did not retain its polymorphic type.");
    }

    console.log(`Runnelo mutation smoke passed (flow ${flowId}, task ${job.id}, config ${configId}).`);
  } finally {
    if (configId) await request(`/config/purge/${configId}`);
    if (flowId) {
      await post("/jobFlow/update", { id: flowId, type: "JOB_FLOW", status: "DELETE", config: { parallelism: 1 } });
      await request(`/jobFlow/purge/${flowId}`);
    }
  }
}

main().catch((error) => {
  console.error(`Runnelo mutation smoke failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
