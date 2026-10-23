import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { setupServer } from "msw/node";
import { workflowHandlers } from "@/mocks/handlers/job";
import { jobFlowHandlers } from "@/mocks/handlers/jobFlow";
import {
  createJobGroup,
  createJobInfo,
  deleteJobGroup,
  getJobGroups,
  getJobsByGroup,
  getJobInfo,
  listJobsForFlow,
} from "./job";
import { createJobFlow } from "./jobFlow";
import { useJobStore } from "@/stores/jobStore";
import { jobTreeStore } from "@/mocks/data/jobTree";

vi.mock("@/config", () => ({
  API: { baseURL: "/api", timeout: 30_000 },
  USE_MOCK_DEFINITION_GROUPS: true,
}));

const server = setupServer(...workflowHandlers, ...jobFlowHandlers);
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterAll(() => server.close());

describe("mock definition groups", () => {
  it("lists multiple roots and rejects a third folder level", async () => {
    expect((await getJobGroups()).length).toBeGreaterThan(1);

    const rootId = await createJobGroup({ name: "New root" });
    try {
      const subgroupId = await createJobGroup({ name: "One level down", pid: rootId });
      expect(await getJobsByGroup(rootId)).toContainEqual(
        expect.objectContaining({ id: subgroupId, kind: "group", pid: rootId }),
      );
      await expect(createJobGroup({ name: "Too deep", pid: subgroupId })).rejects.toThrow();
    } finally {
      await deleteJobGroup(rootId);
    }
  });

  it("keeps new tasks and workflows in their chosen root", async () => {
    const rootId = await createJobGroup({ name: "Definitions for placement" });
    try {
      const previousRefs = new Set([...jobTreeStore.values()].map((node) => node.refId));
      const flowId = await createJobFlow(
        { name: "Example flow", type: "JOB_FLOW", config: { parallelism: 1 }, timeout: { enable: false } },
        rootId,
      );
      const task = await createJobInfo(
        {
          name: "Example task",
          flowId,
          type: "SHELL",
          execMode: "BATCH",
          routeUrl: [1],
          subject: "echo ok",
          config: { type: "SHELL", retryTimes: 0, retryInterval: "5s", timeout: "60s" },
        },
        rootId,
      );

      expect(previousRefs.has(flowId)).toBe(false);
      expect(previousRefs.has(task.id)).toBe(false);

      const children = await getJobsByGroup(rootId);
      expect(children).toContainEqual(expect.objectContaining({ kind: "workflow", refId: flowId, pid: rootId }));
      expect(children).toContainEqual(expect.objectContaining({ kind: "task", refId: task.id, pid: rootId }));
      const jobs = await listJobsForFlow(flowId);
      expect(new Set(jobs.map((job) => job.id)).size).toBe(jobs.length);
    } finally {
      await deleteJobGroup(rootId);
    }
  });
});

describe("mock task settings", () => {
  it("keeps task settings on the task instead of writing its owning workflow", async () => {
    const rootId = await createJobGroup({ name: "Settings root" });
    try {
      const task = await createJobInfo(
        {
          name: "Own settings",
          type: "SHELL",
          execMode: "BATCH",
          routeUrl: [1],
          subject: "echo ok",
          config: { type: "SHELL", retryTimes: 0, retryInterval: "5s", timeout: "60s" },
        },
        rootId,
      );
      const node = (await getJobsByGroup(rootId)).find((item) => item.refId === task.id)!;
      useJobStore.setState({
        treeData: [{ id: rootId, name: "Settings root", kind: "group", pid: "", children: [node] }],
      });

      const settings = await useJobStore.getState().loadJobFlow(node.id);
      expect(settings?.name).toBe("Own settings");
      await useJobStore.getState().saveJobFlow(node.id, {
        ...settings!,
        cronExpr: "0 0 9 * * ?",
        params: { region: "east" },
        alerts: [{ alertId: 7, statuses: ["FAILURE"] }],
      });

      expect(await useJobStore.getState().loadJobFlow(node.id)).toMatchObject({
        cronExpr: "0 0 9 * * ?",
        params: { region: "east" },
        alerts: [{ alertId: 7, statuses: ["FAILURE"] }],
      });
      expect((await getJobInfo(task.id!)).params).toEqual({ region: "east" });

      const seeded = [...jobTreeStore.values()].find((item) => item.kind === "task" && item.refId !== task.id)!;
      const seededInfo = await getJobInfo(seeded.refId!);
      useJobStore.setState({ treeData: [seeded] });
      const seededSettings = await useJobStore.getState().loadJobFlow(seeded.id);
      await useJobStore.getState().saveJobFlow(seeded.id, { ...seededSettings!, params: { checked: true } });
      const jobs = await listJobsForFlow(seededInfo.flowId!);
      expect(new Set(jobs.map((job) => job.id)).size).toBe(jobs.length);
    } finally {
      await deleteJobGroup(rootId);
    }
  });
});
