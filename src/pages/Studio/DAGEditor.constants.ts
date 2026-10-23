import type { Node, Edge } from "@xyflow/react";

export interface DAGEditorProps {
  embedded?: boolean;
  workflowId?: number;
}

export const SIDEBAR_ICON_SIZE = 24;

export function getInitialNodes(workflowId: string, t: (key: string) => string): Node[] {
  void workflowId;
  void t;
  return [];
}

export function getInitialEdges(workflowId: string): Edge[] {
  void workflowId;
  return [];
}
