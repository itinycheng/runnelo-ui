import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";
import { setupServer } from "msw/node";
import { http as mswHttp, HttpResponse } from "msw";
import { unwrapEnvelope, http } from "./request";
import { STORAGE_KEYS } from "@/constants/storage";
import { reportAppError } from "@/app/errorFeedback";

vi.mock("@/app/errorFeedback", () => ({ reportAppError: vi.fn() }));

describe("unwrapEnvelope", () => {
  it("unwraps a success envelope to its data", () => {
    expect(unwrapEnvelope({ code: 0, desc: "success", data: { id: 1 } })).toEqual({ id: 1 });
  });

  it("throws with desc on a non-zero code", () => {
    expect(() => unwrapEnvelope({ code: 500, desc: "boom", data: null })).toThrowError("boom");
  });

  it("passes through a plain (non-envelope) body unchanged", () => {
    const plain = { total: 3, data: [1, 2, 3] as number[] };
    // no `code` field -> not an envelope -> returned as-is
    expect(unwrapEnvelope(plain)).toBe(plain);
  });

  it("passes through primitives and null", () => {
    expect(unwrapEnvelope(null)).toBeNull();
    expect(unwrapEnvelope("ok")).toBe("ok");
  });
});

const server = setupServer(
  mswHttp.get("/api/ok", () => HttpResponse.json({ code: 0, desc: "success", data: { v: 1 } })),
  mswHttp.get("/api/biz", () => HttpResponse.json({ code: 1, desc: "boom", data: null })),
  mswHttp.get("/api/network-a", () => HttpResponse.error()),
  mswHttp.get("/api/network-b", () => HttpResponse.error()),
  mswHttp.get("/api/unauthorized", () => HttpResponse.json({ message: "unauthorized" }, { status: 401 })),
  mswHttp.get("/api/headers", ({ request }) =>
    HttpResponse.json({
      code: 0,
      desc: "success",
      data: { token: request.headers.get("X-Token"), workspace: request.headers.get("X-Workspace-Id") },
    }),
  ),
);
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterAll(() => server.close());
afterEach(() => {
  vi.mocked(reportAppError).mockClear();
  window.history.replaceState(null, "", "/");
});

describe("http interceptor envelope handling", () => {
  it("resolves code:0 to data", async () => {
    await expect(http.get("/ok")).resolves.toEqual({ v: 1 });
  });
  it("rejects code!==0 and publishes a detailed app error", async () => {
    await expect(http.get("/biz")).rejects.toThrow("boom");
    expect(reportAppError).toHaveBeenCalledWith(
      expect.objectContaining({
        key: expect.stringContaining("business"),
        description: "boom",
        code: 1,
        method: "get",
        url: "/biz",
      }),
    );
  });
  it("suppressErrorToast rejects without publishing global feedback", async () => {
    await expect(http.get("/biz", { suppressErrorToast: true })).rejects.toThrow("boom");
    expect(reportAppError).not.toHaveBeenCalled();
  });
  it("deduplicates network failures from different endpoints into one notice", async () => {
    await Promise.allSettled([http.get("/network-a"), http.get("/network-b")]);

    const keys = vi.mocked(reportAppError).mock.calls.map(([notice]) => notice.key);
    expect(keys).toEqual(["network", "network"]);
  });
  it("does not report session expiry while already on the hash login route", async () => {
    window.history.replaceState(null, "", "/#/login");

    await expect(http.get("/unauthorized")).rejects.toThrow();
    expect(reportAppError).not.toHaveBeenCalled();
  });
  it("uses the legacy backend authentication and workspace headers", async () => {
    localStorage.setItem(STORAGE_KEYS.token, "token-1");
    localStorage.setItem(STORAGE_KEYS.workspaceId, "7");
    await expect(http.get("/headers")).resolves.toEqual({ token: "token-1", workspace: "7" });
  });
});
