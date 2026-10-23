import type { JobType } from "./enums";

/** Default icon colors for task types and tree-only node kinds. */
export const TASK_TYPE_ICON_COLORS: Record<JobType | "workflow" | "group", string> = {
  FLINK_SQL: "#e6526f",
  FLINK_JAR: "#e6526f",
  COMMON_JAR: "#6f42c1",
  CLICKHOUSE_SQL: "#e8a317",
  MYSQL_SQL: "#2f6fdb",
  HIVE_SQL: "#e8a317",
  SHELL: "#2e9e4f",
  CONDITION: "#d48806",
  DEPENDENT: "#13a8a8",
  SUB_FLOW: "var(--ant-color-primary)",
  workflow: "var(--ant-color-primary)",
  group: "#8c8c8c",
};

export const TASK_TYPE_ICON_FALLBACK_COLOR = "var(--ant-color-primary)";
