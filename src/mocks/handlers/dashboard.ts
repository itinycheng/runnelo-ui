import { http, delay } from "msw";
import { faker } from "@faker-js/faker";
import { ok } from "@/mocks/lib/response";

export const dashboardHandlers = [
  // Matches the deployed backend's aggregate count endpoint.
  http.get("/api/dashboard/jobFlowRunStatusCount", async () => {
    await delay(200);

    const success = faker.number.int({ min: 80, max: 200 });
    const failed = faker.number.int({ min: 2, max: 15 });
    const running = faker.number.int({ min: 1, max: 8 });

    return ok([
      { status: "SUCCESS", count: success },
      { status: "FAILURE", count: failed },
      { status: "RUNNING", count: running },
    ]);
  }),
  http.get("/api/dashboard/trend", async ({ request }) => {
    await delay(200);
    const range = new URL(request.url).searchParams.get("range");
    const days = range === "30d" ? 30 : range === "14d" ? 14 : 7;
    const today = new Date();

    return ok(
      Array.from({ length: days }, (_, index) => {
        const date = new Date(today);
        date.setUTCDate(date.getUTCDate() - (days - index - 1));
        const dayNumber = Math.floor(date.getTime() / 86_400_000);
        return {
          date: date.toISOString().slice(0, 10),
          success: 100 + ((dayNumber * 13) % 70),
          failed: 2 + ((dayNumber * 5) % 14),
          running: 1 + ((dayNumber * 3) % 8),
        };
      }),
    );
  }),
];
