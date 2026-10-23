import type { WorkflowLifecycleStatus } from "@/types/job";

/** i18n key for each lifecycle status label (reuses the definitions.* namespace). */
export const LIFECYCLE_LABEL_KEY: Record<WorkflowLifecycleStatus, string> = {
  OFFLINE: "definitions.statusOffline",
  ONLINE: "definitions.statusOnline",
  SCHEDULING: "definitions.statusScheduling",
  DELETE: "definitions.statusDelete",
};
