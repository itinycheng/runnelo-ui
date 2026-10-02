import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { JOB_TYPES } from "@/constants/enums";
import { TaskSidebar } from "./DAGEditor.sidebar";

describe("TaskSidebar", () => {
  it("renders the draggable task-type icon palette", () => {
    render(<TaskSidebar />);

    for (const type of JOB_TYPES) {
      expect(screen.getByRole("img", { name: type })).toBeInTheDocument();
    }
    expect(screen.queryByText("Available tasks")).not.toBeInTheDocument();
  });
});
