import { describe, it, expect } from "vitest";
import { EXECUTION_STATUSES } from "@/constants/enums";
import { execStatusSemantic, getExecStatusColor, execIsRunning } from "./runStatus";

describe("execStatus mapping", () => {
  it("maps every ExecutionStatus to a semantic + color", () => {
    const colors = new Set<string>();
    for (const s of EXECUTION_STATUSES) {
      expect(["success", "failed", "running", "killed", "waiting"]).toContain(execStatusSemantic(s));
      expect(typeof getExecStatusColor(s)).toBe("string");
      colors.add(getExecStatusColor(s));
    }
    expect(colors.size).toBe(EXECUTION_STATUSES.length);
  });
  it("execIsRunning true only for in-flight states", () => {
    expect(execIsRunning("RUNNING")).toBe(true);
    expect(execIsRunning("SUBMITTED")).toBe(true);
    expect(execIsRunning("KILLING")).toBe(true);
    expect(execIsRunning("SUCCESS")).toBe(false);
    expect(execIsRunning("KILLED")).toBe(false);
  });

  it("keeps in-flight behavior separate from visual severity", () => {
    expect(execStatusSemantic("RUNNING")).toBe("running");
    expect(getExecStatusColor("RUNNING")).toBe("blue");
    expect(execStatusSemantic("KILLING")).toBe("running");
    expect(getExecStatusColor("KILLING")).toBe("orange");
  });
});
