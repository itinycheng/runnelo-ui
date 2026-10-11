import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import i18n from "@/i18n";
import RunList from "./RunList";

vi.mock("@tanstack/react-query", () => ({
  useMutation: vi.fn(),
  useQuery: vi.fn(),
  useQueryClient: vi.fn(),
}));
vi.mock("@ant-design/pro-components", () => ({
  ProTable: ({
    locale,
    dataSource = [],
  }: {
    locale?: { emptyText?: ReactNode };
    dataSource?: Array<{ id?: string; name?: string }>;
  }) => (
    <div data-testid="pro-table">
      {dataSource.map((row) => (
        <span key={row.id}>{row.name}</span>
      ))}
      {locale?.emptyText}
    </div>
  ),
}));
vi.mock("@/stores/workspaceStore", () => ({
  useWorkspaceStore: (selector: (state: { currentId: number }) => unknown) => selector({ currentId: 1 }),
}));
vi.mock("./RunDetailDrawer", () => ({ default: () => null }));

describe("RunList error states", () => {
  const refetch = vi.fn();

  beforeEach(async () => {
    vi.clearAllMocks();
    await i18n.changeLanguage("en");
    vi.mocked(useMutation).mockReturnValue({ mutate: vi.fn() } as never);
    vi.mocked(useQueryClient).mockReturnValue({ invalidateQueries: vi.fn() } as never);
  });

  it("keeps stale rows visible and reports a failed refresh inline", async () => {
    vi.mocked(useQuery).mockReturnValue({
      data: { data: [{ id: "run-1", name: "stale-run" }], total: 1, page: 1, pageSize: 10 },
      isFetching: false,
      isError: true,
      isRefetchError: true,
      refetch,
    } as never);

    render(
      <MemoryRouter>
        <RunList />
      </MemoryRouter>,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Runs data may be out of date");
    expect(screen.getByTestId("pro-table")).toBeVisible();
    expect(screen.getByText("stale-run")).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(refetch).toHaveBeenCalledOnce();
  });

  it("replaces the empty table region with a retryable initial-load error", async () => {
    vi.mocked(useQuery).mockReturnValue({
      data: undefined,
      isFetching: false,
      isError: true,
      isRefetchError: false,
      refetch,
    } as never);

    render(
      <MemoryRouter>
        <RunList />
      </MemoryRouter>,
    );

    expect(screen.getByTestId("page-load-error")).toHaveTextContent("Failed to load runs");
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(refetch).toHaveBeenCalledOnce();
  });
});
