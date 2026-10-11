import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "antd";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import i18n from "@/i18n";
import { AppErrorFeedbackHost } from "./AppErrorFeedback";
import { reportAppError } from "./errorFeedback";

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

afterEach(() => vi.useRealTimers());

describe("AppErrorFeedbackHost presentation", () => {
  it("shows an actionable notification and opens structured details", async () => {
    render(
      <App notification={{ maxCount: 3, stack: { threshold: 3 } }}>
        <AppErrorFeedbackHost />
      </App>,
    );

    act(() => {
      reportAppError({
        key: "save-flow",
        title: "Workflow save failed",
        description: "Your edits remain on this page.",
        status: 500,
        method: "post",
        url: "/jobFlow/update?token=secret",
        requestId: "request-123",
        persistent: true,
      });
    });

    const title = await screen.findByText("Workflow save failed");
    const description = screen.getByText("Your edits remain on this page.");
    const viewDetailsButton = screen.getByRole("button", { name: "View details" });
    const timestamp = screen.getByText("Just now");
    const actionContent = timestamp.parentElement;
    const actions = actionContent?.parentElement;
    expect(title).toBeVisible();
    expect(timestamp).toBeVisible();
    expect(actionContent).toContainElement(viewDetailsButton);
    expect(title).not.toHaveTextContent("Just now");
    expect(title).toHaveStyle({
      marginInlineStart: "28px",
      paddingInlineEnd: "32px",
    });
    expect(description).toHaveStyle({ marginInlineStart: "28px" });
    expect(actions).toHaveStyle({
      display: "flex",
      float: "none",
      justifyContent: "flex-start",
      marginInlineStart: "28px",
      width: "auto",
    });
    expect(timestamp).toHaveStyle({ flex: "none", fontSize: "12px", fontWeight: "400" });
    expect(viewDetailsButton).toHaveStyle({ height: "auto", padding: "0px" });
    await userEvent.click(viewDetailsButton);
    expect(await screen.findByText("Error details")).toBeVisible();
    expect(screen.getByText("/jobFlow/update")).toBeVisible();
    expect(screen.queryByText(/token=secret/)).not.toBeInTheDocument();
    expect(screen.getByText("request-123")).toBeVisible();

    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    await userEvent.click(screen.getByRole("button", { name: /Copy details$/ }));
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("Request path: /jobFlow/update"));
    expect(writeText).not.toHaveBeenCalledWith(expect.stringContaining("token=secret"));
  });
});

describe("AppErrorFeedbackHost lifecycle", () => {
  it("keeps at most three distinct errors visible", async () => {
    render(
      <App notification={{ maxCount: 3, stack: { threshold: 3 } }}>
        <AppErrorFeedbackHost />
      </App>,
    );

    act(() => {
      for (let index = 1; index <= 4; index += 1) {
        reportAppError({
          key: `error-${index}`,
          title: `Failure ${index}`,
          description: `Request ${index} failed`,
          persistent: true,
        });
      }
    });

    expect(await screen.findByText("Failure 4")).toBeVisible();
    await waitFor(() => expect(screen.getAllByTestId("app-error-notification")).toHaveLength(3));
    expect(screen.queryByText("Failure 1")).not.toBeInTheDocument();
  });

  it("updates a repeated error key in place", async () => {
    render(
      <App notification={{ maxCount: 3, stack: { threshold: 3 } }}>
        <AppErrorFeedbackHost />
      </App>,
    );

    act(() => {
      reportAppError({ key: "network", title: "Network error", description: "First request failed" });
      reportAppError({ key: "network", title: "Network error", description: "Latest request failed" });
    });

    expect(await screen.findByText("Latest request failed")).toBeVisible();
    expect(screen.queryByText("First request failed")).not.toBeInTheDocument();
    expect(screen.getAllByTestId("app-error-notification")).toHaveLength(1);
  });

  it("keeps the relative time current while a persistent notice is visible", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-11T10:00:00Z"));
    render(
      <App notification={{ maxCount: 3, stack: { threshold: 3 } }}>
        <AppErrorFeedbackHost />
      </App>,
    );

    act(() => {
      reportAppError({
        key: "persistent-network",
        title: "Network error",
        description: "No response",
        occurredAt: "2026-10-11T10:00:00Z",
        persistent: true,
      });
    });
    expect(screen.getByText("Just now")).toBeVisible();

    act(() => {
      vi.advanceTimersByTime(12_000);
    });
    expect(screen.getByText("12s ago")).toBeVisible();
  });
});
