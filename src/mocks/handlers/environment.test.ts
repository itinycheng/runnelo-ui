import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { setupServer } from "msw/node";
import { getEnvironmentIdentity } from "@/api/environment";
import { environmentHandlers } from "./environment";

const server = setupServer(...environmentHandlers);
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterAll(() => server.close());
afterEach(() => vi.unstubAllEnvs());
beforeEach(() => {
  vi.stubEnv("VITE_MOCK_ENV_LABEL", "");
  vi.stubEnv("VITE_MOCK_ENV_COLOR", "");
  vi.stubEnv("VITE_MOCK_ENV_HEADER", "");
  vi.stubEnv("VITE_MOCK_ENV_WATERMARK", "");
});

describe("mock environment preview", () => {
  it("returns no marker when preview is not configured", async () => {
    expect(await getEnvironmentIdentity()).toBeNull();
  });

  it("uses any configured label and independently enabled modes", async () => {
    vi.stubEnv("VITE_MOCK_ENV_LABEL", "US PROD PREVIEW");
    vi.stubEnv("VITE_MOCK_ENV_COLOR", "#B42332");
    vi.stubEnv("VITE_MOCK_ENV_HEADER", "true");
    vi.stubEnv("VITE_MOCK_ENV_WATERMARK", "false");

    expect(await getEnvironmentIdentity()).toEqual({
      label: "US PROD PREVIEW",
      color: "#B42332",
      header: true,
      watermark: false,
    });
  });
});
