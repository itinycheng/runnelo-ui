import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import i18n from "@/i18n";
import type { FlowRun } from "@/types/run";
import RunList from "./RunList";

vi.mock("@tanstack/react-query", () => ({
  useMutation: vi.fn(),
  useQuery: vi.fn(),
  useQueryClient: vi.fn(),
}));
vi.mock("@/stores/workspaceStore", () => ({
  useWorkspaceStore: (selector: (state: { currentId: number }) => unknown) => selector({ currentId: 1 }),
}));
vi.mock("./RunDetailDrawer", () => ({ default: () => null }));

const run: FlowRun = {
  id: "run-1",
  flowId: "flow-42",
  name: "daily-sync",
  type: "JOB_FLOW",
  status: "SUCCESS",
  startTime: "2026-10-20T09:00:00+08:00",
  endTime: "2026-10-20T09:03:00+08:00",
  duration: 180,
  submitter: "alice",
  tags: ["production"],
};

describe("RunList column choices", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    localStorage.clear();
    await i18n.changeLanguage("en");
    vi.mocked(useMutation).mockReturnValue({ mutate: vi.fn() } as never);
    vi.mocked(useQueryClient).mockReturnValue({ invalidateQueries: vi.fn() } as never);
    vi.mocked(useQuery).mockReturnValue({
      data: { data: [run], total: 1, page: 1, pageSize: 10 },
      isFetching: false,
      isError: false,
      isRefetchError: false,
      refetch: vi.fn(),
    } as never);
  });

  it("lets users reveal an additional run field without crowding the default table", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <RunList />
      </MemoryRouter>,
    );

    expect(screen.getByText("1 total")).toBeVisible();
    expect(screen.queryByRole("columnheader", { name: "End Time" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Column settings" }));
    expect(await screen.findByRole("checkbox", { name: "Workflow ID" })).toBeInTheDocument();
    await user.click(await screen.findByRole("checkbox", { name: "End Time" }));

    expect(await screen.findByRole("columnheader", { name: "End Time" })).toBeVisible();
  });

  it("lets users pin the Name column again after unpinning it", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <RunList />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole("button", { name: "Column settings" }));
    const nameRow = screen.getByRole("treeitem", { name: "Name" });
    await user.click(within(nameRow).getByRole("img", { name: "vertical-align-middle", hidden: true }));
    expect(screen.getByRole("columnheader", { name: "Name" })).not.toHaveClass("ant-table-cell-fix-start");
    const unpinnedNameRow = screen.getByRole("treeitem", { name: "Name" });
    await user.click(within(unpinnedNameRow).getByRole("img", { name: "vertical-align-top", hidden: true }));

    expect(screen.getByRole("columnheader", { name: "Name" })).toHaveClass("ant-table-cell-fix-start");
  });

  it("uses short row actions and retains the kill confirmation", async () => {
    const user = userEvent.setup();
    vi.mocked(useQuery).mockReturnValue({
      data: { data: [{ ...run, status: "RUNNING" }], total: 1, page: 1, pageSize: 10 },
      isFetching: false,
      isError: false,
      isRefetchError: false,
      refetch: vi.fn(),
    } as never);

    render(
      <MemoryRouter>
        <RunList />
      </MemoryRouter>,
    );

    expect(screen.getByText("Detail")).toBeVisible();
    await user.click(screen.getByText("Terminate"));
    await waitFor(() => expect(screen.getByText("Terminate this run?")).toBeVisible());
  });
});
