import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import JobTabWrapper from "./index";

vi.mock("@/pages/Studio/JobForm", () => ({ default: () => <div>Task form</div> }));
vi.mock("@/pages/Studio/DAGEditor", () => ({ default: () => <div>Workflow editor</div> }));

describe("JobTabWrapper", () => {
  it("keeps Schedule, Parameters and Alerts available for a task", () => {
    render(<JobTabWrapper node={{ id: "job:19", refId: 19, name: "Task", kind: "task", pid: "g-1" }} />);

    expect(screen.getByText("Task form")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Schedule" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Parameters" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Alerts" })).toBeInTheDocument();
  });
});
