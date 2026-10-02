import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { setupServer } from "msw/node";
import { jobFlowHandlers } from "@/mocks/handlers/jobFlow";
import { workflowHandlers } from "@/mocks/handlers/job";
import { createJobInfo, listJobsForFlow } from "./job";
import { jobTreeStore } from "@/mocks/data/jobTree";
import {
  createJobFlow,
  getJobFlow,
  updateJobFlow,
  copyJobFlow,
  startSchedule,
  stopSchedule,
  runFlowOnce,
  getFlowGraph,
  updateFlowGraph,
  previewCron,
} from "./jobFlow";

const server = setupServer(...jobFlowHandlers, ...workflowHandlers);
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterAll(() => server.close());

describe("jobFlow API + mock", () => {
  it("seeds persisted-looking DAG data for mock tree workflows", async () => {
    const workflow = [...jobTreeStore.values()].find((node) => node.kind === "workflow" && node.refId != null);
    expect(workflow?.refId).toBeDefined();

    const graph = await getFlowGraph(workflow!.refId!);
    expect(graph.nodes).toHaveLength(3);
    expect(graph.edges).toHaveLength(2);
    await expect(listJobsForFlow(workflow!.refId!)).resolves.toEqual(
      expect.arrayContaining(graph.nodes.map((node) => expect.objectContaining({ id: node.jobId }))),
    );
  });

  it("creates then gets a JobFlow", async () => {
    const id = await createJobFlow({ name: "f1", type: "JOB_FLOW", cronExpr: "0 0 * * *", config: { parallelism: 2 } });
    expect(typeof id).toBe("number");
    const flow = await getJobFlow(id);
    expect(flow.name).toBe("f1");
    expect(flow.status).toBe("OFFLINE");
  });

  it("start/stop schedule flips status", async () => {
    const id = await createJobFlow({ name: "f2", type: "JOB_FLOW" });
    await startSchedule(id);
    expect((await getJobFlow(id)).status).toBe("SCHEDULING");
    await stopSchedule(id);
    expect((await getJobFlow(id)).status).toBe("ONLINE");
  });

  it("update merges and runOnce returns an id", async () => {
    const id = await createJobFlow({ name: "f3", type: "JOB_FLOW" });
    await updateJobFlow({ id, name: "f3-renamed", type: "JOB_FLOW" });
    expect((await getJobFlow(id)).name).toBe("f3-renamed");
    expect(typeof (await runFlowOnce(id))).toBe("number");
  });

  it("rejects non-numeric ids like the legacy Long path variable", async () => {
    await expect(getJobFlow("wf-abc123")).rejects.toThrow("工作流 ID 必须是数字");
  });

  it("copies a JobFlow under a new id", async () => {
    const id = await createJobFlow({ name: "f4", type: "JOB_FLOW" });
    const copyId = await copyJobFlow(id);
    expect(typeof copyId).toBe("number");
    expect(copyId).not.toBe(id);
  });

  it("round-trips the UI graph through the legacy vertices/edges contract", async () => {
    const flowId = await createJobFlow({ name: "legacy-flow", type: "JOB_FLOW" });
    const job = await createJobInfo({
      name: "extract",
      flowId,
      type: "MYSQL_SQL",
      execMode: "BATCH",
      routeUrl: [1],
      subject: "select 1",
      config: { type: "MYSQL_SQL", retryTimes: 0, retryInterval: "5s", dsId: 1 },
    });
    await expect(listJobsForFlow(flowId)).resolves.toContainEqual(expect.objectContaining({ id: job.id, flowId }));
    await updateFlowGraph(flowId, {
      nodes: [{ id: String(job.id), jobId: job.id, taskType: job.type, label: job.name, x: 10, y: 20 }],
      edges: [],
    });

    await expect(getFlowGraph(flowId)).resolves.toEqual({
      nodes: [expect.objectContaining({ id: String(job.id), jobId: job.id, label: "extract", x: 10, y: 20 })],
      edges: [],
    });
  });

  it("uses the backend Quartz parser for schedule previews", async () => {
    await expect(previewCron("0 0 0 * * ?")).resolves.toEqual(["2026-09-28 00:00:00", "2026-09-29 00:00:00"]);
    await expect(previewCron("0 0 * * *")).rejects.toThrow("Invalid cron expression");
  });
});
