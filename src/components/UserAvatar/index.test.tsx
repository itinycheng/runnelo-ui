import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import UserAvatar from "./index";
import { useAuthStore, useAuthPermissions } from "@/stores/authStore";
import { useWorkspaceStore } from "@/stores/workspaceStore";

vi.mock("@/stores/authStore", () => ({
  useAuthStore: vi.fn(),
  useAuthPermissions: vi.fn(),
}));
vi.mock("@/stores/workspaceStore", () => ({
  useWorkspaceStore: vi.fn(),
}));

function renderAvatar() {
  return render(
    <MemoryRouter>
      <UserAvatar />
    </MemoryRouter>,
  );
}

describe("UserAvatar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuthStore).mockImplementation((selector) =>
      selector({
        user: { username: "admin", roles: { global: "SUPER_ADMIN", workspaces: {} } },
        logout: vi.fn(),
      } as never),
    );
    vi.mocked(useAuthPermissions).mockReturnValue(["SYSTEM_MANAGE", "WORKSPACE_VIEW"]);
    vi.mocked(useWorkspaceStore).mockImplementation((selector) =>
      selector({ currentId: 1, workspaces: [{ id: 1, name: "Default Workspace" }] } as never),
    );
  });

  it("renders the global role and effective permission tags for admin", async () => {
    renderAvatar();

    await userEvent.click(screen.getByRole("button", { name: "Account: admin" }));

    expect(await screen.findByText("Super Admin")).toBeInTheDocument();
    expect(screen.getByText("System manage")).toBeInTheDocument();
    expect(screen.getByText("Workspace view")).toBeInTheDocument();
  });

  it("renders nothing when there is no user", () => {
    vi.mocked(useAuthStore).mockImplementation((selector) => selector({ user: null, logout: vi.fn() } as never));

    const { container } = renderAvatar();

    expect(container).toBeEmptyDOMElement();
  });
});
