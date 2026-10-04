import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Button, Tooltip } from "antd";
import { FullscreenOutlined, FullscreenExitOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { type Edge, type Node } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { FlowCanvas } from "@/components/FlowCanvas";
import type { FlowRunGraph } from "@/types/run";

interface RunFlowGraphProps {
  graph: FlowRunGraph;
  onNodeClick?: (nodeId: string) => void;
}

/** Read-only DAG of a flow run — reuses the Studio canvas + node components, with
 *  each node colored by its run status. A fullscreen toggle helps view large DAGs. */
export function RunFlowGraph({ graph, onNodeClick }: RunFlowGraphProps) {
  const { t } = useTranslation();
  const [full, setFull] = useState(false);

  const nodes = useMemo<Node[]>(
    () =>
      graph.nodes.map((n) => ({
        id: n.id,
        type: "taskNode",
        position: { x: n.x, y: n.y },
        data: { label: n.label, taskType: n.type, status: n.status },
      })),
    [graph],
  );
  const edges = useMemo<Edge[]>(
    () => graph.edges.map((e, i) => ({ id: `e-${i}`, source: e.source, target: e.target, type: "status" })),
    [graph],
  );

  const canvas = (
    <div style={{ display: "flex", position: "relative", flex: 1, minHeight: 0 }}>
      <FlowCanvas nodes={nodes} edges={edges} readOnly onNodeClick={(_, node) => onNodeClick?.(node.id)} />
      <Tooltip title={t(full ? "runs.exitFullscreen" : "runs.fullscreen")}>
        <Button
          size="small"
          icon={full ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
          onClick={() => setFull((f) => !f)}
          style={{ position: "absolute", top: 8, right: 8, zIndex: 6 }}
        />
      </Tooltip>
    </div>
  );

  if (full) {
    // Portal to <body> so the overlay isn't clipped by the Drawer's transform.
    return createPortal(
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 1100,
          background: "var(--ant-color-bg-container)",
          display: "flex",
        }}
      >
        {canvas}
      </div>,
      document.body,
    );
  }

  return (
    <div style={{ display: "flex", height: 380, border: "1px solid var(--ant-color-border-secondary)" }}>{canvas}</div>
  );
}
