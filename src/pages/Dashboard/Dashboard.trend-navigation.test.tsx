import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import Dashboard from "./index";

vi.mock("@tanstack/react-query", () => ({
  useQuery: vi.fn(({ queryKey }) =>
    JSON.stringify(queryKey).includes('"trend"')
      ? { data: [{ date: "2026-10-21", success: 12, failed: 3, running: 1 }] }
      : JSON.stringify(queryKey).includes('"dashboard"')
        ? { data: { totalTasks: 16, successTasks: 12, failedTasks: 3, runningTasks: 1 } }
        : { data: { data: [] }, isPending: false },
  ),
}));
vi.mock("@/stores/workspaceStore", () => ({
  useWorkspaceStore: (selector: (state: { currentId: number }) => unknown) => selector({ currentId: 1 }),
}));
vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  LineChart: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Line: ({ dataKey, onClick }: { dataKey: string; onClick: () => void }) => (
    <button type="button" onClick={onClick}>
      {dataKey}
    </button>
  ),
  PieChart: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Pie: () => null,
  Cell: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
}));

function SearchQuery() {
  return <div>{useLocation().search}</div>;
}

describe("Dashboard trend drilldown", () => {
  it("uses the API status for failed runs", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Routes>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/runs" element={<SearchQuery />} />
        </Routes>
      </MemoryRouter>,
    );

    await user.click(screen.getByRole("button", { name: "failed", hidden: true }));
    expect(screen.getByText("?status=FAILURE")).toBeInTheDocument();
  });
});
