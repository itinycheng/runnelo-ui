import { http } from "@/utils/request";
import type { LegacyStatusCountDto } from "@/api/legacy/contracts";
import { formatLegacyDateTime } from "@/api/legacy/date";
import { ENABLE_MOCK } from "@/config";

const FAILED_STATUSES = ["FAILURE", "KILLED", "ABNORMAL", "ERROR", "NOT_EXIST", "EXPECTED_FAILURE"] as const;
const RUNNING_STATUSES = ["SUBMITTED", "RUNNING", "CREATED", "KILLING", "WAITING"] as const;

export interface DashboardStats {
  totalTasks: number;
  successTasks: number;
  failedTasks: number;
  runningTasks: number;
}

export interface TrendDataPoint {
  date: string;
  success: number;
  failed: number;
  running: number;
}

export function getStats(): Promise<DashboardStats> {
  const end = new Date();
  const start = new Date(end.getTime() - 24 * 60 * 60 * 1_000);
  return http
    .get<LegacyStatusCountDto[]>("/dashboard/jobFlowRunStatusCount", {
      params: { startTime: formatLegacyDateTime(start), endTime: formatLegacyDateTime(end) },
    })
    .then((rows) => {
      const counts = new Map(rows.map((row) => [row.status, Number(row.count)]));
      const sum = (statuses: readonly string[]) =>
        statuses.reduce((total, status) => total + (counts.get(status) ?? 0), 0);
      return {
        totalTasks: [...counts.values()].reduce((total, count) => total + count, 0),
        successTasks: counts.get("SUCCESS") ?? 0,
        failedTasks: sum(FAILED_STATUSES),
        runningTasks: sum(RUNNING_STATUSES),
      };
    });
}

export function getTrend(range: string): Promise<TrendDataPoint[]> {
  if (import.meta.env.DEV && ENABLE_MOCK) {
    return http.get<TrendDataPoint[]>("/dashboard/trend", { params: { range } });
  }
  // The deployed backend provides aggregate status counts but no daily trend
  // endpoint. Keep live data empty rather than fabricate production metrics.
  return Promise.resolve([]);
}
