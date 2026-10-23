import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import MainLayout from "./MainLayout";

const { onCollapse, onMenuItemClick } = vi.hoisted(() => ({ onCollapse: vi.fn(), onMenuItemClick: vi.fn() }));

vi.mock("@ant-design/pro-components", () => ({
  ProLayout: ({
    logo,
    headerContentRender,
    menuItemRender,
    children,
  }: {
    logo?: ReactNode;
    headerContentRender?: (props: {
      isMobile: boolean;
      collapsed: boolean;
      onCollapse: typeof onCollapse;
    }) => ReactNode;
    menuItemRender?: (item: { path: string; name: string; onClick: () => void }, dom: ReactNode) => ReactNode;
    children: ReactNode;
  }) => (
    <div>
      <header>{logo}</header>
      {headerContentRender?.({ isMobile: true, collapsed: true, onCollapse })}
      <nav>
        {menuItemRender?.({ path: "/audit-logs", name: "Audit Log", onClick: onMenuItemClick }, <span>Audit Log</span>)}
      </nav>
      {children}
    </div>
  ),
}));
vi.mock("@/stores/authStore", () => ({
  useAuthStore: (selector: (state: { isAuthenticated: boolean; loadUserInfo: () => Promise<void> }) => unknown) =>
    selector({ isAuthenticated: false, loadUserInfo: async () => {} }),
  useAuthPermissions: () => ["WORKSPACE_VIEW"],
}));
vi.mock("@/components/UserAvatar", () => ({ default: () => null }));
vi.mock("@/components/LangSwitcher", () => ({ default: () => null }));
vi.mock("@/components/WorkspaceSwitcher", () => ({ default: () => null }));

describe("mobile navigation", () => {
  beforeEach(() => {
    onCollapse.mockClear();
    onMenuItemClick.mockClear();
  });

  it("provides a named button that opens the collapsed menu with a keyboard", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Routes>
          <Route path="/" element={<MainLayout />}>
            <Route path="dashboard" element={<div>Dashboard</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    const trigger = screen.getByRole("button", { name: /^Open navigation/ });
    expect(trigger).toHaveTextContent("Dashboard");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    trigger.focus();
    await user.keyboard("{Enter}");
    expect(onCollapse).toHaveBeenCalledWith(false);
  });

  it("uses a keyboard-activatable link for menu destinations", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Routes>
          <Route path="/" element={<MainLayout />}>
            <Route path="dashboard" element={<div>Dashboard</div>} />
            <Route path="audit-logs" element={<div>Audit Content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    const auditLink = screen.getByText("Audit Log").closest("a");
    expect(auditLink).toHaveAttribute("href", "/audit-logs");
    auditLink?.focus();
    await user.keyboard("{Enter}");
    expect(screen.getByText("Audit Content")).toBeInTheDocument();
    expect(onMenuItemClick).toHaveBeenCalledTimes(1);
  });
});
