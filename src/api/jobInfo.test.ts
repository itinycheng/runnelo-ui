import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { setupServer } from "msw/node";
import { message } from "antd";
import { workflowHandlers } from "@/mocks/handlers/job";
import { createJobInfo, getJobInfo, updateJobInfo } from "./job";

const server = setupServer(...workflowHandlers);
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterAll(() => server.close());

describe("jobInfo API + mock", () => {
  it("creates then gets a JobInfo, assigning an id and ONLINE status", async () => {
    const created = await createJobInfo({
      name: "j1",
      type: "MYSQL_SQL",
      execMode: "BATCH",
      routeUrl: [1],
      subject: "SELECT 1",
      config: { type: "MYSQL_SQL", retryTimes: 0, retryInterval: "5s", dsId: 1 },
    });
    expect(typeof created.id).toBe("number");
    expect(created.status).toBe("ONLINE");
    const fetched = await getJobInfo(created.id!);
    expect(fetched.name).toBe("j1");
  });

  it("updates a JobInfo", async () => {
    const created = await createJobInfo({
      name: "j2",
      type: "SHELL",
      execMode: "BATCH",
      routeUrl: [1],
      subject: "echo",
      config: { type: "SHELL", retryTimes: 0, retryInterval: "5s", timeout: "60s" },
    });
    const updated = await updateJobInfo({ ...created, name: "j2-renamed" });
    expect(updated.name).toBe("j2-renamed");
  });

  it("rejects non-numeric ids like the legacy Long path variable", async () => {
    // Ant Design's static message API mounts a React root asynchronously. Mock
    // it here so the scheduler cannot outlive Vitest's jsdom environment.
    const messageSpy = vi.spyOn(message, "error").mockImplementation(() => ({}) as never);
    await expect(getJobInfo("task-abc123")).rejects.toThrow("任务 ID 必须是数字");
    expect(messageSpy).toHaveBeenCalledWith("任务 ID 必须是数字");
    messageSpy.mockRestore();
  });
});
