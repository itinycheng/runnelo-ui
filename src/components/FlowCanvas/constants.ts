import type React from "react";
import { addEdge, type Connection, type Edge, MarkerType } from "@xyflow/react";
import { STATUS_TOKEN_BG, STATUS_TOKEN_COLOR } from "@/utils/statusColor";

/**
 * Presentational constants for the shared FlowCanvas — edge status colors/labels,
 * handle styling, and the small edge helpers. Business graph seeding (initial
 * nodes/edges) stays with the consuming page, not here.
 */
export type EdgeStatus = "default" | "success" | "failure";

export const EDGE_STATUS_COLORS: Record<EdgeStatus, string> = {
  default: STATUS_TOKEN_COLOR.neutral,
  success: STATUS_TOKEN_COLOR.success,
  failure: STATUS_TOKEN_COLOR.error,
};

export const EDGE_STATUS_LABELS: Record<EdgeStatus, { text: string; bg: string } | null> = {
  default: null,
  success: { text: "Success", bg: STATUS_TOKEN_BG.success },
  failure: { text: "Failure", bg: STATUS_TOKEN_BG.error },
};

export const handleStyle: React.CSSProperties = {
  width: 8,
  height: 8,
  background: "var(--ant-color-primary)",
  border: "2px solid var(--ant-color-bg-container)",
  opacity: 0,
  transition: "opacity 0.2s ease",
};

// DAG node/edge selection & hover styling lives beside FlowCanvas in
// FlowCanvas.css; React Flow exposes those states only through CSS classes.

/** Append a new "status" edge for a user-drawn connection. */
export function appendStatusEdge(params: Connection, eds: Edge[]): Edge[] {
  return addEdge(
    {
      ...params,
      type: "status",
      markerEnd: { type: MarkerType.ArrowClosed, color: STATUS_TOKEN_COLOR.neutral },
      data: { status: "default" },
    },
    eds,
  );
}

export function getEdgeStyle(status: EdgeStatus) {
  return {
    stroke: EDGE_STATUS_COLORS[status],
    strokeWidth: status === "default" ? 1 : 2,
  };
}
