import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Empty, Flex, message, Typography } from "antd";
import { useNodesState, useEdgesState, type Connection, type ReactFlowInstance } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useTranslation } from "react-i18next";
import { useJobStore } from "@/stores/jobStore";
import { useThemeStore } from "@/stores/themeStore";
import { FlowCanvas } from "@/components/FlowCanvas";
import { appendStatusEdge } from "@/components/FlowCanvas/constants";
import { type DAGEditorProps, getInitialEdges, getInitialNodes } from "./DAGEditor.constants";
import {
  useBottomPanel,
  useContextMenu,
  useDragAndDrop,
  useFlowPersistence,
  useNodeEditModal,
} from "./DAGEditor.hooks";
import { BottomPanel, DAGToolbar } from "./DAGEditor.panels";
import { NodeEditModal } from "./DAGEditor.modal";
import { TaskSidebar } from "./DAGEditor.sidebar";

// The editor coordinates several small hooks; splitting the JSX orchestration
// would obscure their shared canvas state without reducing component complexity.
// eslint-disable-next-line max-lines-per-function
export default function DAGEditor({ embedded = false }: DAGEditorProps) {
  const { id: routeId } = useParams<{ id: string }>();
  const selectedNode = useJobStore((s) => s.selectedNode);
  const themePreset = useThemeStore((s) => s.preset);
  const [messageApi, contextHolder] = message.useMessage();
  const { t } = useTranslation();

  const workflowId = embedded ? (selectedNode?.id ?? "wf") : (routeId ?? "wf");
  const initialNodes = useMemo(() => getInitialNodes(workflowId, t), [workflowId, t]);
  const initialEdges = useMemo(() => getInitialEdges(workflowId), [workflowId]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [taskListOpen, setTaskListOpen] = useState(true);
  const flowRef = useRef<HTMLDivElement>(null);

  const editModal = useNodeEditModal({ nodes, setNodes, messageApi });
  const ctx = useContextMenu({
    flowRef,
    setNodes,
    setEdges,
    messageApi,
    t,
    onOpenNodeEdit: editModal.openEditModal,
  });
  const bottom = useBottomPanel({ flowRef });
  const dnd = useDragAndDrop({ reactFlowInstance, workflowId, setNodes });

  // Loads a persisted FlowGraph onto the canvas on mount + serializes/saves on demand.
  const { handleSave, isLoading } = useFlowPersistence({
    workflowId,
    nodes,
    edges,
    setNodes,
    setEdges,
    messageApi,
    t,
  });
  const hasNodes = nodes.length > 0;

  // Node bounds become measurable shortly after async restoration (and after
  // a theme changes typography). Fit once at that stable point.
  useEffect(() => {
    if (isLoading || !hasNodes || !reactFlowInstance) return;
    const timer = window.setTimeout(() => void reactFlowInstance.fitView({ padding: 0.2, maxZoom: 1 }), 80);
    return () => window.clearTimeout(timer);
  }, [hasNodes, isLoading, reactFlowInstance, themePreset]);

  const onConnect = useCallback((params: Connection) => setEdges((eds) => appendStatusEdge(params, eds)), [setEdges]);

  return (
    <Flex vertical style={{ height: "100%" }} onClick={ctx.closeContextMenu}>
      {contextHolder}
      {bottom.isResizing && <div style={{ position: "fixed", inset: 0, zIndex: 9999, cursor: "row-resize" }} />}
      <Flex style={{ flex: 1, minHeight: 0 }}>
        {taskListOpen && <TaskSidebar />}
        <Flex vertical style={{ flex: 1, minWidth: 0, minHeight: 0 }}>
          <FlowCanvas
            key={`${workflowId}-${isLoading ? "loading" : "loaded"}`}
            flowRef={flowRef}
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeContextMenu={ctx.onNodeContextMenu}
            onEdgeContextMenu={ctx.onEdgeContextMenu}
            onPaneClick={ctx.closeContextMenu}
            onNodeDoubleClick={(_e, node) => bottom.setBottomPanelNode(node)}
            onInit={setReactFlowInstance}
            onDragOver={dnd.onDragOver}
            onDrop={dnd.onDrop}
            toolbar={
              <DAGToolbar
                embedded={embedded}
                onSave={() => void handleSave()}
                taskListOpen={taskListOpen}
                onToggleTaskList={() => setTaskListOpen((open) => !open)}
              />
            }
            emptyContent={
              !isLoading && !hasNodes ? (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={
                    <Flex vertical gap={4}>
                      <Typography.Text strong>{t("dag.emptyCanvasTitle")}</Typography.Text>
                      <Typography.Text type="secondary">{t("dag.emptyCanvasHint")}</Typography.Text>
                    </Flex>
                  }
                />
              ) : undefined
            }
            contextMenu={ctx.contextMenu}
            nodeMenuItems={ctx.nodeMenuItems}
            edgeMenuItems={ctx.edgeMenuItems}
            onMenuClick={ctx.handleMenuClick}
          />
          {bottom.bottomPanelNode && (
            <BottomPanel
              node={bottom.bottomPanelNode}
              panelHeight={bottom.bottomPanelHeight}
              onResizeMouseDown={bottom.onResizeMouseDown}
              onClose={bottom.closeBottomPanel}
              onSaveNode={(nodeId, patch) =>
                setNodes((nds) => nds.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, ...patch } } : n)))
              }
              messageApi={messageApi}
            />
          )}
        </Flex>
      </Flex>
      <NodeEditModal
        open={editModal.open}
        form={editModal.form}
        onSave={editModal.handleSave}
        onCancel={editModal.handleCancel}
      />
    </Flex>
  );
}
