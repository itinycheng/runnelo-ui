import { render, screen } from "@testing-library/react";
import { useQuery } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import i18n from "@/i18n";
import Dashboard from "./index";

vi.mock("@tanstack/react-query", () => ({ useQuery: vi.fn() }));
vi.mock("@/stores/workspaceStore", () => ({
  useWorkspaceStore: (selector: (state: { currentId: number }) => unknown) => selector({ currentId: 1 }),
}));

describe("Dashboard screen reader labels", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
    vi.mocked(useQuery).mockImplementation(({ queryKey }) => {
      const key = JSON.stringify(queryKey);
      if (key.includes('"trend"')) {
        return { data: [{ date: "2026-10-21", success: 12, failed: 3, running: 1 }] } as never;
      }
      if (key.includes('"dashboard"')) {
        return { data: { totalTasks: 16, successTasks: 12, failedTasks: 3, runningTasks: 1 } } as never;
      }
      return { data: { data: [] }, isPending: false } as never;
    });
  });

  it("names sections, chart data, and each run-list action distinctly", () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { level: 1, name: "Dashboard" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Status Breakdown" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Task Run Trend" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "View all Recent Failures" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "View all Running Now" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /12 successful.*3 failed.*1 running/i })).toBeInTheDocument();
    expect(screen.getByRole("table", { name: "Task Run Trend" })).toBeInTheDocument();
  });
});
