import { act, render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getFlowGraph } from "@/api/jobFlow";
import { useJobStore } from "@/stores/jobStore";
import DAGEditor from "./DAGEditor";

vi.mock("@/api/jobFlow", () => ({ getFlowGraph: vi.fn().mockResolvedValue({ nodes: [], edges: [] }) }));
vi.mock("@/components/FlowCanvas", () => ({ FlowCanvas: () => <div /> }));

describe("embedded DAG editor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useJobStore.setState({ selectedNode: { id: "wf-random", refId: 17, name: "Flow", kind: "workflow", pid: "g-1" } });
  });

  it("loads its own workflow when another tree node becomes selected", async () => {
    render(<DAGEditor embedded workflowId={17} />);
    await waitFor(() => expect(getFlowGraph).toHaveBeenCalledWith("17"));

    act(() => {
      useJobStore.setState({ selectedNode: { id: "task-random", refId: 19, name: "Task", kind: "task", pid: "g-1" } });
    });
    expect(getFlowGraph).toHaveBeenCalledTimes(1);
  });
});
