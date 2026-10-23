import { describe, it, expect, vi, beforeEach } from "vitest";
import { useJobStore } from "./jobStore";
import * as jobApi from "@/api/job";
import * as jobFlowApi from "@/api/jobFlow";

vi.mock("@/api/job");
vi.mock("@/api/jobFlow");

describe("jobStore jobInfo actions", () => {
  beforeEach(() => vi.clearAllMocks());

  it("loadJobInfo delegates to getJobInfo", async () => {
    vi.mocked(jobApi.getJobInfo).mockResolvedValue({
      id: 5,
      name: "x",
      type: "SHELL",
      execMode: "BATCH",
      routeUrl: [1],
      config: { type: "SHELL", retryTimes: 0, retryInterval: "5s", timeout: "60s" },
    } as never);
    const info = await useJobStore.getState().loadJobInfo("5");
    expect(jobApi.getJobInfo).toHaveBeenCalledWith("5");
    expect(info?.name).toBe("x");
  });

  it("keeps task parameters on JobInfo with the real backend adapter", async () => {
    const task = {
      id: 19,
      name: "Task",
      type: "SHELL" as const,
      execMode: "BATCH" as const,
      routeUrl: [1],
      params: { region: "west" },
      config: { type: "SHELL" as const, retryTimes: 0, retryInterval: "5s", timeout: "60s" },
    };
    vi.mocked(jobApi.getJobInfo).mockResolvedValue(task);
    vi.mocked(jobApi.updateJobInfo).mockResolvedValue({ ...task, params: { region: "east" } });
    useJobStore.setState({ treeData: [{ id: "job:19", refId: 19, name: "Task", kind: "task", pid: "g-1" }] });

    const settings = await useJobStore.getState().loadJobFlow("job:19");
    expect(settings?.params).toEqual({ region: "west" });
    await useJobStore.getState().saveJobFlow("job:19", { ...settings!, params: { region: "east" } });

    expect(jobApi.updateJobInfo).toHaveBeenCalledWith({ ...task, params: { region: "east" } });
    expect(jobFlowApi.updateJobFlow).not.toHaveBeenCalled();
  });

  it("saveJobInfo creates when no id, updates when id present, and sets refId on the node", async () => {
    vi.mocked(jobApi.createJobInfo).mockResolvedValue({ id: 9, name: "n" } as never);
    vi.mocked(jobApi.updateJobInfo).mockResolvedValue({ id: 9, name: "n" } as never);
    const draftNode = { id: "tmp", name: "n", kind: "task" as const, pid: "" };
    useJobStore.setState({
      treeData: [draftNode],
      selectedNode: draftNode,
      openTabs: [{ key: "tmp", node: draftNode }],
      activeTabKey: "tmp",
    });
    await useJobStore.getState().saveJobInfo("tmp", {
      name: "n",
      type: "SHELL",
      execMode: "BATCH",
      routeUrl: [1],
      config: { type: "SHELL", retryTimes: 0, retryInterval: "5s", timeout: "60s" },
    } as never);
    expect(jobApi.createJobInfo).toHaveBeenCalled();
    expect(useJobStore.getState().treeData.find((n) => n.id === "job:9")?.refId).toBe(9);
    expect(useJobStore.getState().selectedNode?.id).toBe("job:9");
    expect(useJobStore.getState().openTabs[0]?.key).toBe("job:9");
    expect(useJobStore.getState().activeTabKey).toBe("job:9");

    await useJobStore.getState().saveJobInfo("9", {
      id: 9,
      name: "n",
      type: "SHELL",
      execMode: "BATCH",
      routeUrl: [1],
      config: { type: "SHELL", retryTimes: 0, retryInterval: "5s", timeout: "60s" },
    } as never);
    expect(jobApi.updateJobInfo).toHaveBeenCalled();
  });
});

describe("jobStore group/leaf backend wiring", () => {
  beforeEach(() => vi.clearAllMocks());

  it("createGroup calls backend then adds a group node", async () => {
    vi.mocked(jobApi.createJobGroup).mockResolvedValue("g-new");
    useJobStore.setState({ treeData: [] });
    await useJobStore.getState().createGroup("G", "");
    expect(jobApi.createJobGroup).toHaveBeenCalledWith({ name: "G", pid: "" });
    expect(useJobStore.getState().treeData.some((n) => n.id === "g-new" && n.kind === "group")).toBe(true);
  });

  it("createWorkflow persists a compatible legacy flow and opens it", async () => {
    vi.mocked(jobFlowApi.createJobFlow).mockResolvedValue(17);
    useJobStore.setState({
      treeData: [{ id: "legacy:definitions", name: "Definitions", kind: "group", pid: "", children: [] }],
      openTabs: [],
      activeTabKey: null,
      selectedNode: null,
    });

    await useJobStore.getState().createWorkflow("daily-etl", "legacy:definitions");

    expect(jobFlowApi.createJobFlow).toHaveBeenCalledWith(
      {
        name: "daily-etl",
        type: "JOB_FLOW",
        config: { parallelism: 1 },
        timeout: { enable: false },
      },
      "legacy:definitions",
    );
    const node = useJobStore.getState().selectedNode;
    expect(node).toMatchObject({ id: "flow:17", refId: 17, name: "daily-etl", kind: "workflow" });
    expect(useJobStore.getState().activeTabKey).toBe("flow:17");
  });

  it("deleteNode routes groups to deleteJobGroup and leaves to deleteTreeNode", async () => {
    vi.mocked(jobApi.deleteJobGroup).mockResolvedValue(true);
    vi.mocked(jobApi.deleteTreeNode).mockResolvedValue(true);
    useJobStore.setState({
      treeData: [
        { id: "g1", name: "g", kind: "group", pid: "", children: [{ id: "l1", name: "l", kind: "task", pid: "g1" }] },
      ],
      openTabs: [],
      activeTabKey: null,
      selectedNode: null,
    });
    await useJobStore.getState().deleteNode({ id: "l1", name: "l", kind: "task", pid: "g1" });
    expect(jobApi.deleteTreeNode).toHaveBeenCalledWith("l1");
    await useJobStore.getState().deleteNode({ id: "g1", name: "g", kind: "group", pid: "" });
    expect(jobApi.deleteJobGroup).toHaveBeenCalledWith("g1");
  });

  it("renameNode routes group nodes to renameJobGroup and updates the tree", async () => {
    vi.mocked(jobApi.renameJobGroup).mockResolvedValue("g1");
    useJobStore.setState({
      treeData: [{ id: "g1", name: "g", kind: "group", pid: "", children: [] }],
      openTabs: [],
      activeTabKey: null,
      selectedNode: null,
    });
    await useJobStore.getState().renameNode({ id: "g1", name: "g", kind: "group", pid: "" }, "g-renamed");
    expect(jobApi.renameJobGroup).toHaveBeenCalledWith({ id: "g1", name: "g-renamed" });
    expect(jobApi.renameTreeNode).not.toHaveBeenCalled();
    expect(useJobStore.getState().treeData.find((n) => n.id === "g1")?.name).toBe("g-renamed");
  });

  it("renameNode routes leaf nodes to renameTreeNode and updates the tree", async () => {
    vi.mocked(jobApi.renameTreeNode).mockResolvedValue("l1");
    useJobStore.setState({
      treeData: [{ id: "l1", name: "l", kind: "task", pid: "" }],
      openTabs: [],
      activeTabKey: null,
      selectedNode: null,
    });
    await useJobStore.getState().renameNode({ id: "l1", name: "l", kind: "task", pid: "" }, "l-renamed");
    expect(jobApi.renameTreeNode).toHaveBeenCalledWith({ id: "l1", name: "l-renamed" });
    expect(jobApi.renameJobGroup).not.toHaveBeenCalled();
    expect(useJobStore.getState().treeData.find((n) => n.id === "l1")?.name).toBe("l-renamed");
  });

  it("createGroup leaves the tree unmutated when the backend call rejects", async () => {
    vi.mocked(jobApi.createJobGroup).mockRejectedValue(new Error("x"));
    useJobStore.setState({ treeData: [] });
    await expect(useJobStore.getState().createGroup("G", "")).rejects.toThrow();
    expect(useJobStore.getState().treeData).toEqual([]);
  });
});
