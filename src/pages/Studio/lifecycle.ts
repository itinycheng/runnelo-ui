import type { WorkflowLifecycleStatus } from "@/types/job";
import { STATUS_TOKEN_COLOR } from "@/utils/statusColor";

/** Concrete dot colors for the lifecycle status indicator on definition nodes. */
export const LIFECYCLE_DOT_COLOR: Record<WorkflowLifecycleStatus, string> = {
  OFFLINE: STATUS_TOKEN_COLOR.neutral,
  ONLINE: STATUS_TOKEN_COLOR.info,
  SCHEDULING: STATUS_TOKEN_COLOR.success,
  DELETE: STATUS_TOKEN_COLOR.error,
};

/** i18n key for each lifecycle status label (reuses the definitions.* namespace). */
export const LIFECYCLE_LABEL_KEY: Record<WorkflowLifecycleStatus, string> = {
  OFFLINE: "definitions.statusOffline",
  ONLINE: "definitions.statusOnline",
  SCHEDULING: "definitions.statusScheduling",
  DELETE: "definitions.statusDelete",
};
