import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Grid } from "antd";
import { beforeEach, describe, expect, it, vi } from "vitest";
import QueryConsole from "./QueryConsole";

const { pickHistory } = vi.hoisted(() => ({ pickHistory: vi.fn() }));

vi.mock("./useQueryConsole", () => ({
  useQueryConsole: () => ({
    editorRef: { current: null },
    sql: "",
    setSql: vi.fn(),
    running: false,
    result: null,
    history: { entries: [{ sql: "SELECT 1", ts: 1 }], clear: vi.fn() },
    run: vi.fn(),
    formatSql: vi.fn(),
    clear: vi.fn(),
    pickHistory,
    exportCsv: vi.fn(),
    options: [],
    datasourceId: undefined,
    setDatasourceId: vi.fn(),
    insertToken: vi.fn(),
  }),
}));
vi.mock("@/components/CodeEditor", () => ({ default: () => null }));
vi.mock("./SchemaSidebar", () => ({ default: () => null }));
vi.mock("./ResultPanel", () => ({ default: () => null }));

describe("Query history selection", () => {
  beforeEach(() => {
    pickHistory.mockClear();
    vi.spyOn(Grid, "useBreakpoint").mockReturnValue({ lg: true });
  });

  it("selects the chosen saved query from the menu", async () => {
    const user = userEvent.setup();
    render(<QueryConsole />);

    await user.click(screen.getByRole("button", { name: "History" }));
    await user.click(await screen.findByRole("menuitem", { name: /SELECT 1/i }));

    expect(pickHistory).toHaveBeenCalledWith({ sql: "SELECT 1", ts: 1 });
  });
});
