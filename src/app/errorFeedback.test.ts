import { describe, expect, it, vi } from "vitest";
import { reportAppError, subscribeToAppErrors } from "./errorFeedback";

describe("errorFeedback", () => {
  it("normalizes the timestamp and delivers the notice to subscribers", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToAppErrors(listener);

    reportAppError({ key: "save", title: "Save failed", description: "Changes were preserved" });

    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({
        key: "save",
        title: "Save failed",
        occurredAt: expect.any(String),
      }),
    );

    unsubscribe();
    reportAppError({ key: "delete", title: "Delete failed", description: "Try again" });
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
