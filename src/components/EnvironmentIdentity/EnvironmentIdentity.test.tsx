import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getEnvironmentIdentity } from "@/api/environment";
import { EnvironmentHeader, EnvironmentIdentityProvider, EnvironmentWatermark } from "./index";

vi.mock("@/api/environment", () => ({ getEnvironmentIdentity: vi.fn() }));

function renderIdentity() {
  return render(
    <EnvironmentIdentityProvider>
      <EnvironmentHeader />
      <EnvironmentWatermark />
    </EnvironmentIdentityProvider>,
  );
}

describe("environment identity", () => {
  beforeEach(() => vi.resetAllMocks());

  it("shows an arbitrary label in the header when only header is configured", async () => {
    vi.mocked(getEnvironmentIdentity).mockResolvedValue({
      label: "US UAT",
      color: "#315E9D",
      header: true,
      watermark: false,
    });

    renderIdentity();

    expect(await screen.findByText("US UAT")).toBeVisible();
    expect(screen.queryByTestId("environment-watermark")).not.toBeInTheDocument();
  });

  it("shows only the watermark when only watermark is configured", async () => {
    vi.mocked(getEnvironmentIdentity).mockResolvedValue({
      label: "US PROD",
      color: "#B42332",
      header: false,
      watermark: true,
    });

    renderIdentity();

    const watermark = await screen.findByTestId("environment-watermark");
    expect(watermark).toHaveAttribute("aria-hidden", "true");
    expect(watermark).toHaveTextContent("US PROD");
    expect(screen.queryByTestId("environment-header")).not.toBeInTheDocument();
  });

  it("shows no marker when the deployment has no environment configuration", async () => {
    vi.mocked(getEnvironmentIdentity).mockResolvedValue(null);

    renderIdentity();

    await waitFor(() => expect(getEnvironmentIdentity).toHaveBeenCalledTimes(1));
    expect(screen.queryByTestId("environment-header")).not.toBeInTheDocument();
    expect(screen.queryByTestId("environment-watermark")).not.toBeInTheDocument();
  });

  it("warns in the header if runtime environment information cannot be fetched", async () => {
    vi.mocked(getEnvironmentIdentity).mockRejectedValue(new Error("offline"));

    renderIdentity();

    expect(await screen.findByText("Environment unknown")).toBeVisible();
    expect(screen.queryByTestId("environment-watermark")).not.toBeInTheDocument();
  });
});
