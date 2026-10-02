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
    throw new Error(`${init.method || "GET"} ${path}: HTTP ${response.status}, code=${body?.code}, ${body?.desc || "unknown error"}`);
  }
  return body.data;
}

function assertObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label}: expected an object response`);
  }
  return value;
}

function assertArray(value, label) {
  if (!Array.isArray(value)) throw new Error(`${label}: expected an array response`);
  return value;
}

function assertPage(value, label) {
  const page = assertObject(value, label);
  if (!Array.isArray(page.records) || typeof page.total !== "number") {
    throw new Error(`${label}: expected a MyBatis page with records and total`);
  }
}

async function authenticate() {
  const config = await request("/login/config");
  if (token) return config;
  if (String(config.authType).toUpperCase() !== "LOCAL") {
    throw new Error(`Backend uses ${config.authType}; provide FLINK_PLATFORM_TOKEN for the authenticated checks.`);
  }
  if (!username || !password) {
    throw new Error("Set FLINK_PLATFORM_USERNAME and FLINK_PLATFORM_PASSWORD, or provide FLINK_PLATFORM_TOKEN.");
  }
  const login = await request("/login", {
    method: "POST",
    body: JSON.stringify({ username, password, workspaceId: workspaceId ? Number(workspaceId) : undefined }),
  });
  token = login.token;
  workspaceId ||= login.workspaceId == null ? undefined : String(login.workspaceId);
  return config;
}

async function main() {
  const config = await authenticate();
  const workspaces = assertArray(await request("/workspace/list"), "workspace/list");
  workspaceId ||= workspaces[0]?.id == null ? undefined : String(workspaces[0].id);
  const user = assertObject(await request("/user/info"), "user/info");
  if (typeof user.name !== "string") throw new Error("user/info: missing user name");

  const checks = [
    ["/dashboard/jobFlowRunStatusCount", assertArray],
    ["/jobFlow/page?page=1&size=1", assertPage],
    ["/jobInfo/page?page=1&size=1", assertPage],
    ["/jobFlowRun/page?page=1&size=1", assertPage],
    ["/resource/page?page=1&size=1", assertPage],
    ["/datasource/page?page=1&size=1", assertPage],
    ["/worker/page?page=1&size=1", assertPage],
    ["/alert/page?page=1&size=1", assertPage],
    ["/audit-logs?page=1&size=1", assertPage],
  ];
  if (workspaceId) {
    for (const [path, validate] of checks) validate(await request(path), path);
  }
  console.log(`Runnelo backend smoke passed (${config.authType}).`);
}

main().catch((error) => {
  console.error(`Runnelo backend smoke failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
