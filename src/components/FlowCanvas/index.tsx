import type React from "react";
import { ConfigProvider, Dropdown, type MenuProps } from "antd";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Panel,
  type Connection,
  type Edge,
  type Node,
  type NodeMouseHandler,
  type EdgeMouseHandler,
  type ReactFlowInstance,
  type OnNodesChange,
  type OnEdgesChange,
} from "@xyflow/react";
import { compactMenuTheme } from "@/theme";
import { StatusEdge, TaskNode } from "./nodes";

/**
 * Shared DAG canvas used by both the Studio editor and the read-only run graph.
 * Node/edge styling is baked in (unified app-wide via {@link TaskNode}/{@link StatusEdge}).
 * The orchestrating page drives it through controlled props (state in) + event
 * callbacks (events out) + a `toolbar` slot; it never reaches into the canvas.
 */
const edgeTypes = { status: StatusEdge };
const nodeTypes = { taskNode: TaskNode };

function CanvasEmptyState({ children }: { children?: React.ReactNode }) {
  if (!children) return null;
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 3,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "none",
      }}
    >
      {children}
    </div>
  );
}

function CanvasContextMenu({
  contextMenu,
  nodeMenuItems,
  edgeMenuItems,
  onMenuClick,
}: Pick<FlowCanvasProps, "contextMenu" | "nodeMenuItems" | "edgeMenuItems" | "onMenuClick">) {
  if (!contextMenu) return null;
  return (
    <ConfigProvider theme={compactMenuTheme}>
      <Dropdown
        open
        menu={{
          items: contextMenu.type === "node" ? nodeMenuItems : edgeMenuItems,
          onClick: ({ key }) => onMenuClick?.(key),
        }}
        styles={{ root: { position: "fixed" } }}
      >
        <div style={{ position: "absolute", left: contextMenu.x, top: contextMenu.y, width: 1, height: 1 }} />
      </Dropdown>
    </ConfigProvider>
  );
}

export interface FlowCanvasProps {
  nodes: Node[];
  edges: Edge[];
  /** Read-only mode disables editing (drag/connect/context menu/toolbar) — used by the run graph. */
  readOnly?: boolean;
  onNodeClick?: NodeMouseHandler;
  /** On-canvas widgets (defaults on). */
  showMiniMap?: boolean;
  showControls?: boolean;
  showBackground?: boolean;
  /** Rendered top-right inside a ReactFlow Panel (editing mode only), e.g. a save toolbar. */
  toolbar?: React.ReactNode;
  /** Centered non-interactive guidance rendered when the owning surface has no graph data. */
  emptyContent?: React.ReactNode;
  flowRef?: React.RefObject<HTMLDivElement | null>;
  onNodesChange?: OnNodesChange;
  onEdgesChange?: OnEdgesChange;
  onConnect?: (params: Connection) => void;
  onNodeContextMenu?: NodeMouseHandler;
  onEdgeContextMenu?: EdgeMouseHandler;
  onPaneClick?: () => void;
  onNodeDoubleClick?: NodeMouseHandler;
  onInit?: (instance: ReactFlowInstance) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  contextMenu?: { type: "node" | "edge"; id: string; x: number; y: number } | null;
  nodeMenuItems?: MenuProps["items"];
  edgeMenuItems?: MenuProps["items"];
  onMenuClick?: (key: string) => void;
}

export function FlowCanvas({
  nodes,
  edges,
  readOnly = false,
  onNodeClick,
  showMiniMap = true,
  showControls = true,
  showBackground = true,
  toolbar,
  emptyContent,
  flowRef,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onNodeContextMenu,
  onEdgeContextMenu,
  onPaneClick,
  onNodeDoubleClick,
  onInit,
  onDragOver,
  onDrop,
  contextMenu,
  nodeMenuItems,
  edgeMenuItems,
  onMenuClick,
}: FlowCanvasProps) {
  // Editing-only handlers — omitted entirely in read-only mode (run graph).
  const editHandlers = readOnly
    ? {}
    : { onConnect, onNodeContextMenu, onEdgeContextMenu, onNodeDoubleClick, onDragOver, onDrop };

  return (
    <div style={{ flex: 1, position: "relative", minHeight: 0 }} ref={flowRef}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onInit={onInit}
        nodesDraggable={!readOnly}
        nodesConnectable={!readOnly}
        elementsSelectable={!readOnly}
        nodesFocusable={!readOnly}
        {...editHandlers}
        fitView
        fitViewOptions={{ maxZoom: 1, minZoom: 0.5 }}
        style={{ background: "#fff" }}
      >
        {showBackground && <Background gap={16} size={1} />}
        {showControls && <Controls showInteractive={!readOnly} />}
        {showMiniMap && <MiniMap nodeStrokeWidth={3} />}
        {!readOnly && toolbar && <Panel position="top-right">{toolbar}</Panel>}
      </ReactFlow>
      <CanvasEmptyState>{emptyContent}</CanvasEmptyState>
      {!readOnly && (
        <CanvasContextMenu
          contextMenu={contextMenu}
          nodeMenuItems={nodeMenuItems}
          edgeMenuItems={edgeMenuItems}
          onMenuClick={onMenuClick}
        />
      )}
    </div>
  );
}
