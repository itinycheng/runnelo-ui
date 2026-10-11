import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PageLoadError from ".";

describe("PageLoadError", () => {
  it("keeps the failure in context and exposes retry", async () => {
    const onRetry = vi.fn();
    render(
      <PageLoadError
        title="Runs failed to load"
        description="Try again shortly"
        retryLabel="Retry"
        onRetry={onRetry}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Runs failed to load");
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
