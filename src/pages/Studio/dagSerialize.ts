import { MarkerType, type Node, type Edge } from "@xyflow/react";
import type { FlowGraph, FlowNode, FlowEdge } from "@/types/flow";
import { STATUS_TOKEN_COLOR } from "@/utils/statusColor";

/**
 * Serialize the new-UI XYFlow canvas into a {@link FlowGraph} for
 * `POST /jobFlow/updateFlow`. Faithful to the canvas (node data + positions +
 * edges), not the legacy vertex/jobId model — the backend accepts both.
 */
function nodeData(node: Node): Record<string, unknown> {
  return (node.data ?? {}) as Record<string, unknown>;
}

function str(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

export function serializeFlow(nodes: Node[], edges: Edge[]): FlowGraph {
  const flowNodes: FlowNode[] = nodes.map((n) => {
    const data = nodeData(n);
    return {
      id: n.id,
      jobId: typeof data.jobId === "number" ? data.jobId : undefined,
      taskType: str(data.taskType),
      label: str(data.label),
      description: str(data.description) || undefined,
      priority: str(data.priority) || undefined,
      config: (data.config as Record<string, unknown> | undefined) || undefined,
      subject: str(data.subject) || undefined,
      x: Math.round(n.position.x),
      y: Math.round(n.position.y),
    };
  });

  const flowEdges: FlowEdge[] = edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    status: str((e.data as { status?: string } | undefined)?.status, "default"),
  }));

  return { nodes: flowNodes, edges: flowEdges };
}

/** Reconstruct XYFlow canvas nodes/edges from a persisted {@link FlowGraph}. */
export function deserializeFlow(graph: FlowGraph): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = graph.nodes.map((n) => ({
    id: n.id,
    type: "taskNode",
    position: { x: n.x, y: n.y },
    data: {
      label: n.label,
      jobId: n.jobId,
      taskType: n.taskType,
      description: n.description,
      priority: n.priority,
      config: n.config,
      subject: n.subject,
      nodeType: "task",
    },
  }));

  const markerEnd = { type: MarkerType.ArrowClosed, color: STATUS_TOKEN_COLOR.neutral };
  const edges: Edge[] = graph.edges.map((e) => ({
    id: e.id,
    type: "status",
    source: e.source,
    target: e.target,
    markerEnd,
    data: { status: e.status },
  }));

  return { nodes, edges };
}
