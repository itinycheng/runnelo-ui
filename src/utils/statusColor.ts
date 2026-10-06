// Unified tag coloring for entity `status` and `type`/category fields across the app.
// Use `statusColor` for values with good/bad semantics, `enumColor` for neutral categories.
// Both return Ant Design Tag color tokens (or preset palette names).
import type { ExecutionStatus } from "@/constants/enums";

interface ExecutionStatusVisual {
  tagColor: string;
  color: string;
}

/** Exact execution-state palette. Keep this as the single source for run tags and graph nodes. */
export const EXECUTION_STATUS_VISUALS: Record<ExecutionStatus, ExecutionStatusVisual> = {
  SUBMITTED: { tagColor: "cyan", color: "#13C2C2" },
  RUNNING: { tagColor: "blue", color: "#1677FF" },
  SUCCESS: { tagColor: "green", color: "#52C41A" },
  FAILURE: { tagColor: "red", color: "#FF4D4F" },
  KILLED: { tagColor: "volcano", color: "#FA541C" },
  ABNORMAL: { tagColor: "purple", color: "#722ED1" },
  ERROR: { tagColor: "magenta", color: "#EB2F96" },
  NOT_EXIST: { tagColor: "default", color: "var(--ant-color-text-tertiary)" },
  CREATED: { tagColor: "geekblue", color: "#2F54EB" },
  KILLING: { tagColor: "orange", color: "#FA8C16" },
  EXPECTED_FAILURE: { tagColor: "lime", color: "#A0D911" },
  WAITING: { tagColor: "gold", color: "#FAAD14" },
};

export function executionStatusTagColor(status: ExecutionStatus): string {
  return EXECUTION_STATUS_VISUALS[status].tagColor;
}

export function executionStatusVisualColor(status: ExecutionStatus): string {
  return EXECUTION_STATUS_VISUALS[status].color;
}

/** Semantic colors for non-Tag renderers (charts, graph strokes, icons and dots).
 * CSS variables keep those third-party/custom visuals synchronized with ConfigProvider. */
export const STATUS_TOKEN_COLOR = {
  success: "var(--ant-color-success)",
  error: "var(--ant-color-error)",
  info: "var(--ant-color-info)",
  warning: "var(--ant-color-warning)",
  neutral: "var(--ant-color-text-quaternary)",
} as const;

export const STATUS_TOKEN_BG = {
  success: "var(--ant-color-success-bg)",
  error: "var(--ant-color-error-bg)",
  info: "var(--ant-color-info-bg)",
  warning: "var(--ant-color-warning-bg)",
  neutral: "var(--ant-color-fill-quaternary)",
} as const;

/** Semantic status → Ant Design Tag color token. Keyed by meaning, case-insensitive. */
const STATUS_COLOR: Record<string, string> = {
  // healthy / active
  success: "green",
  normal: "green",
  active: "green",
  online: "green",
  enable: "green",
  enabled: "green",
  ok: "green",
  // in progress
  running: "blue",
  scheduling: "cyan",
  // waiting
  pending: "gold",
  waiting: "gold",
  // inactive / neutral
  offline: "default",
  disable: "default",
  disabled: "default",
  stopped: "default",
  inactive: "default",
  // failure
  failed: "error",
  failure: "error",
  error: "error",
  locked: "red",
  delete: "red",
  deleted: "red",
  // aborted / warning
  killed: "warning",
  timeout: "warning",
};

/** Color for a status-like value (active/online/success/failed/…). Falls back to neutral. */
export function statusColor(value: string | undefined | null): string {
  if (!value) return "default";
  return STATUS_COLOR[value.toLowerCase()] ?? "default";
}

// Categorical palette for neutral enums (type/role/channel/engine…). Deliberately excludes
// green/red so category colors never clash with status semantics.
const ENUM_PALETTE = ["blue", "geekblue", "purple", "cyan", "magenta", "gold", "lime", "volcano"];

/** Stable color for a neutral category value — the same string always maps to the same color. */
export function enumColor(value: string | undefined | null): string {
  if (!value) return "default";
  let hash = 0;
  for (let i = 0; i < value.length; i++) hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  return ENUM_PALETTE[hash % ENUM_PALETTE.length];
}

/** Audit actions are categorical, but a few carry established semantic meaning. */
const ACTION_COLOR: Record<string, string> = {
  CREATE: "green",
  UPDATE: "blue",
  DELETE: "red",
  LOGIN: "geekblue",
  LOGOUT: "default",
  RUN: "purple",
  ONLINE: "cyan",
  OFFLINE: "orange",
};

export function actionColor(value: string | undefined | null): string {
  if (!value) return "default";
  return ACTION_COLOR[value.toUpperCase()] ?? enumColor(value);
}
