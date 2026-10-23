import { App as AntApp } from "antd";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import i18n from "@/i18n";
import Login from "./index";

vi.mock("@/api/auth", () => ({ getLoginConfig: async () => ({ authType: "LOCAL" }) }));
vi.mock("@/stores/authStore", () => ({
  useAuthStore: (selector: (state: { login: () => Promise<void>; loginSso: () => Promise<void> }) => unknown) =>
    selector({ login: async () => {}, loginSso: async () => {} }),
}));
vi.mock("./LoginBackground", () => ({ default: () => null }));
vi.mock("@/components/BrandLogo", () => ({ default: () => null }));
vi.mock("@/components/EnvironmentIdentity", () => ({
  EnvironmentHeader: () => null,
  EnvironmentWatermark: () => null,
}));

describe("Login password visibility", () => {
  beforeEach(async () => i18n.changeLanguage("en"));

  it("lets a keyboard user show and hide the password", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <AntApp>
          <Login />
        </AntApp>
      </MemoryRouter>,
    );

    const input = (await screen.findByLabelText("Password")) as HTMLInputElement;
    expect(input.type).toBe("password");
    const toggle = screen.getByRole("button", { name: "Show password" });
    toggle.focus();
    await user.keyboard("{Enter}");
    expect(input.type).toBe("text");
    await user.tab();
    expect(screen.getByRole("button", { name: "Hide password" })).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(input.type).toBe("password");
  });
});
