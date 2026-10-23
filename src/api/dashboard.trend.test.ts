import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { setupServer } from "msw/node";
import { dashboardHandlers } from "@/mocks/handlers/dashboard";
import { getTrend } from "./dashboard";

vi.mock("@/config", () => ({
  API: { baseURL: "/api", timeout: 30_000 },
  ENABLE_MOCK: true,
}));

const server = setupServer(...dashboardHandlers);
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterAll(() => server.close());

describe("Dashboard mock trend", () => {
  it("shows a point for each day in the selected range", async () => {
    const trend = await getTrend("14d");

    expect(trend).toHaveLength(14);
    expect(trend.every((point) => /^\d{4}-\d{2}-\d{2}$/.test(point.date))).toBe(true);
    expect(trend.every((point) => point.success > 0 && point.failed >= 0 && point.running >= 0)).toBe(true);
  });

  it("keeps the same date's values stable when the range changes", async () => {
    const sevenDays = await getTrend("7d");
    const thirtyDays = await getTrend("30d");

    expect(sevenDays.at(-1)).toEqual(thirtyDays.at(-1));
  });
});
