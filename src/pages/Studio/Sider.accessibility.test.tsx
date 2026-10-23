import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import SiderPanel from "./Sider";

vi.mock("./JobTree", () => ({ default: () => <div>Job tree content</div> }));

describe("Studio explorer accessibility", () => {
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes("max-width"),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  it("starts with the explorer closed on narrow screens and opens it from a named button", () => {
    render(<SiderPanel />);
    const treeButton = screen.getByRole("button", { name: /explorer/i });
    expect(treeButton).toHaveAttribute("aria-pressed", "false");
    expect(screen.queryByText("Job tree content")).not.toBeInTheDocument();

    fireEvent.click(treeButton);
    expect(treeButton).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Job tree content")).toBeInTheDocument();
  });

  it("resizes the desktop explorer with arrow keys", () => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    render(<SiderPanel />);
    const resizer = screen.getByRole("separator", { name: /resize/i });
    expect(resizer).toHaveAttribute("aria-valuenow", "240");
    fireEvent.keyDown(resizer, { key: "ArrowRight" });
    expect(resizer).toHaveAttribute("aria-valuenow", "250");
  });
});
