import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import MainLayout from "./MainLayout";
import { useAuthStore, useAuthPermissions } from "@/stores/authStore";

vi.mock("@/stores/authStore", () => ({
  useAuthStore: vi.fn(),
  useAuthPermissions: vi.fn(),
}));
// UserAvatar/WorkspaceSwitcher/LangSwitcher pull in their own store wiring —
// stub them out so this test can focus purely on MainLayout's own rehydrate effect.
vi.mock("@/components/UserAvatar", () => ({ default: () => null }));
vi.mock("@/components/LangSwitcher", () => ({ default: () => null }));
vi.mock("@/components/WorkspaceSwitcher", () => ({ default: () => null }));

function renderLayout() {
  return render(
    <MemoryRouter initialEntries={["/dashboard"]}>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route path="dashboard" element={<div>Dashboard Content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe("MainLayout", () => {
  const loadUserInfo = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
    loadUserInfo.mockClear().mockResolvedValue(undefined);
    vi.mocked(useAuthPermissions).mockReturnValue(["WORKSPACE_VIEW"]);
  });

  it("refetches /user/info on mount even when a cached user is already present (Fix 2)", () => {
    vi.mocked(useAuthStore).mockImplementation((selector) =>
      selector({
        isAuthenticated: true,
        user: { username: "admin", roles: { global: "SUPER_ADMIN" } },
        loadUserInfo,
      } as never),
    );

    renderLayout();

    // A cached user must not short-circuit the refetch — otherwise a
    // post-workspace-switch reload (or a server-side role change) would never
    // be picked up until the cache is cleared some other way.
    expect(loadUserInfo).toHaveBeenCalledTimes(1);
  });

  it("does not call loadUserInfo when not authenticated", () => {
    vi.mocked(useAuthStore).mockImplementation((selector) =>
      selector({
        isAuthenticated: false,
        user: null,
        loadUserInfo,
      } as never),
    );

    renderLayout();

    expect(loadUserInfo).not.toHaveBeenCalled();
  });

  it("keeps the desktop header navigation visible", async () => {
    vi.mocked(useAuthStore).mockImplementation((selector) =>
      selector({ isAuthenticated: false, user: null, loadUserInfo } as never),
    );

    renderLayout();

    expect(await screen.findByRole("link", { name: /Dashboard/ })).toBeInTheDocument();
  });
});
