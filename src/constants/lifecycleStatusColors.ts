import type { WorkflowLifecycleStatus } from "@/types/job";
import { STATUS_TOKEN_COLOR } from "@/utils/statusColor";

/** Colors for task and workflow scheduling lifecycle states. */
export const LIFECYCLE_STATUS_COLORS: Record<WorkflowLifecycleStatus, string> = {
  OFFLINE: "var(--ant-color-text-tertiary)",
  ONLINE: "#1677FF",
  SCHEDULING: STATUS_TOKEN_COLOR.success,
  DELETE: STATUS_TOKEN_COLOR.error,
};
