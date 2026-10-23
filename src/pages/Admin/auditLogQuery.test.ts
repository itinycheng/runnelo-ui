import { describe, expect, it } from "vitest";
import type { AuditLogQuery } from "@/api/admin";
import { replaceAuditLogFilters } from "./auditLogQuery";

describe("replaceAuditLogFilters", () => {
  it("removes previously selected filters when the compact filter clears them", () => {
    const previous: AuditLogQuery = {
      page: 3,
      pageSize: 20,
      action: "CREATE",
      operator: "alice",
      startTime: "2026-10-01T00:00:00.000Z",
      endTime: "2026-10-20T00:00:00.000Z",
    };

    expect(replaceAuditLogFilters(previous, {})).toEqual({ page: 1, pageSize: 20 });
  });

  it("keeps only the newly submitted filter values", () => {
    const previous: AuditLogQuery = { page: 2, pageSize: 10, action: "DELETE" };

    expect(replaceAuditLogFilters(previous, { module: "workflow", result: "success", _timestamp: 123 })).toEqual({
      page: 1,
      pageSize: 10,
      module: "workflow",
      result: "success",
    });
  });
});
