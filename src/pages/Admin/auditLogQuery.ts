import type { AuditLogQuery } from "@/api/admin";

/** Replace the currently selected audit filters after a filter-bar submission. */
export function replaceAuditLogFilters(current: AuditLogQuery, values: Record<string, unknown>): AuditLogQuery {
  const next: AuditLogQuery = { page: 1, pageSize: current.pageSize };
  for (const key of ["operator", "action", "module", "startTime", "endTime"] as const) {
    const value = values[key];
    if (typeof value === "string" && value) next[key] = value;
  }
  if (values.result === "success" || values.result === "failed") next.result = values.result;
  return next;
}
