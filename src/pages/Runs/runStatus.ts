import type { TFunction } from "i18next";
import {
  EXECUTION_STATUSES,
  JOB_FLOW_TYPES,
  type ExecutionStatus,
  type JobFlowType,
  type JobType,
} from "@/constants/enums";
import { executionStatusTagColor } from "@/utils/statusColor";

/** Format a duration given in seconds as a human-readable string. */
export function formatDuration(seconds: number): string {
  if (!seconds) return "-";
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}

export type RunSemantic = "success" | "failed" | "running" | "killed" | "waiting";

const EXECUTION_SEMANTICS: Record<ExecutionStatus, RunSemantic> = {
  SUBMITTED: "waiting",
  CREATED: "waiting",
  WAITING: "waiting",
  RUNNING: "running",
  KILLING: "running",
  SUCCESS: "success",
  KILLED: "killed",
  FAILURE: "failed",
  ERROR: "failed",
  ABNORMAL: "failed",
  EXPECTED_FAILURE: "failed",
  NOT_EXIST: "failed",
};

/** Map a backend `ExecutionStatus` to the app's semantic status bucket. */
export function execStatusSemantic(s: ExecutionStatus): RunSemantic {
  return EXECUTION_SEMANTICS[s];
}

export function getExecStatusColor(s: ExecutionStatus): string {
  return executionStatusTagColor(s);
}

export function getExecStatusOptions(t: TFunction) {
  return EXECUTION_STATUSES.map((value) => ({ value, label: t(`enums.ExecutionStatus.${value}`) }));
}

export const execIsRunning = (s: ExecutionStatus): boolean =>
  s === "SUBMITTED" || s === "RUNNING" || s === "KILLING" || s === "CREATED" || s === "WAITING";

/** All statuses shown with the "failed" (red) tag — the full failure bucket, not just `FAILURE`. */
export const FAILED_EXEC_STATUSES = EXECUTION_STATUSES.filter((s) => execStatusSemantic(s) === "failed");

/** All statuses considered in-flight/cancellable — the full running bucket, not just `RUNNING`. */
export const RUNNING_EXEC_STATUSES = EXECUTION_STATUSES.filter((s) => execIsRunning(s));

/** True if `type` is a composite flow type (`JOB_FLOW`/`JOB_LIST`) rather than a single-task `JobType`. */
export const isFlowType = (type: JobType | JobFlowType): boolean =>
  (JOB_FLOW_TYPES as readonly string[]).includes(type);
