import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import type React from "react";
import { Form, type MenuProps } from "antd";
import { useTranslation } from "react-i18next";
import type { MessageInstance } from "antd/es/message/interface";
import {
  type Node,
  type Edge,
  type ReactFlowInstance,
  type NodeMouseHandler,
  type EdgeMouseHandler,
  MarkerType,
} from "@xyflow/react";
import type { TFunction } from "i18next";
import { EDGE_STATUS_COLORS, getEdgeStyle, type EdgeStatus } from "@/components/FlowCanvas/constants";
import { useJobStore } from "@/stores/jobStore";
import { getFlowGraph } from "@/api/jobFlow";
import { serializeFlow, deserializeFlow } from "./dagSerialize";

interface UseFlowPersistenceOpts {
  workflowId: string;
  nodes: Node[];
  edges: Edge[];
  setNodes: Dispatch<SetStateAction<Node[]>>;
  setEdges: Dispatch<SetStateAction<Edge[]>>;
  messageApi: MessageInstance;
  t: TFunction;
}

/** Load a persisted FlowGraph onto the canvas on mount, and serialize+save it on demand. */
export function useFlowPersistence({
  workflowId,
  nodes,
  edges,
  setNodes,
  setEdges,
  messageApi,
  t,
}: UseFlowPersistenceOpts) {
  const saveFlowGraph = useJobStore((s) => s.saveFlowGraph);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    void getFlowGraph(workflowId)
      .then((graph) => {
        if (!alive) return;
        const restored = deserializeFlow(graph);
        setNodes(restored.nodes);
        setEdges(restored.edges);
      })
      .finally(() => {
        if (alive) setIsLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [workflowId, setNodes, setEdges]);

  const handleSave = useCallback(async () => {
    try {
      await saveFlowGraph(workflowId, serializeFlow(nodes, edges));
      void messageApi.success(t("dag.flowSaved"));
    } catch {
      // handled by the global interceptor toast
    }
  }, [saveFlowGraph, workflowId, nodes, edges, messageApi, t]);

  return { handleSave, isLoading };
}

type ContextMenuState = { type: "node" | "edge"; id: string; x: number; y: number } | null;

interface UseContextMenuOpts {
  flowRef: React.RefObject<HTMLDivElement | null>;
  setNodes: Dispatch<SetStateAction<Node[]>>;
  setEdges: Dispatch<SetStateAction<Edge[]>>;
  messageApi: MessageInstance;
  t: TFunction;
  onOpenNodeEdit: (nodeId: string) => void;
}

const NODE_MENU_KEYS = ["edit", "delete"] as const;

function applyEdgeStatus(setEdges: Dispatch<SetStateAction<Edge[]>>, edgeId: string, status: EdgeStatus) {
  setEdges((eds) =>
    eds.map((e) =>
      e.id === edgeId
        ? {
            ...e,
            style: getEdgeStyle(status),
            animated: status === "default",
            markerEnd: { type: MarkerType.ArrowClosed, color: EDGE_STATUS_COLORS[status] },
            data: { ...e.data, status },
          }
        : e,
    ),
  );
}

export function useContextMenu({ flowRef, setNodes, setEdges, messageApi, t, onOpenNodeEdit }: UseContextMenuOpts) {
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);
  const closeContextMenu = useCallback(() => setContextMenu(null), []);

  const openMenu = useCallback(
    (type: "node" | "edge", id: string, event: React.MouseEvent) => {
      event.preventDefault();
      const bounds = flowRef.current?.getBoundingClientRect();
      setContextMenu({ type, id, x: event.clientX - (bounds?.left ?? 0), y: event.clientY - (bounds?.top ?? 0) });
    },
    [flowRef],
  );

  const onNodeContextMenu: NodeMouseHandler = useCallback(
    (event, node) => openMenu("node", node.id, event),
    [openMenu],
  );
  const onEdgeContextMenu: EdgeMouseHandler = useCallback(
    (event, edge) => openMenu("edge", edge.id, event),
    [openMenu],
  );

  const nodeMenuItems: MenuProps["items"] =
    contextMenu?.type === "node"
      ? [
          { key: "edit", label: t("dag.editNode") },
          { type: "divider" },
          { key: "delete", label: t("dag.deleteNode"), danger: true },
        ]
      : [];
  const edgeMenuItems: MenuProps["items"] =
    contextMenu?.type === "edge"
      ? [
          { key: "success", label: t("dag.setSuccess") },
          { key: "failure", label: t("dag.setFailure") },
          { key: "reset", label: t("dag.resetStatus") },
          { type: "divider" },
          { key: "delete", label: t("dag.deleteEdge"), danger: true },
        ]
      : [];

  const handleMenuClick = useCallback(
    (key: string) => {
      if (!contextMenu) return;
      const { type, id } = contextMenu;
      closeContextMenu();
      if (type === "node") {
        if (key === NODE_MENU_KEYS[0]) onOpenNodeEdit(id);
        else if (key === NODE_MENU_KEYS[1]) {
          setNodes((nds) => nds.filter((n) => n.id !== id));
          setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
          void messageApi.success(t("dag.nodeDeleted"));
        }
        return;
      }
      if (key === "delete") {
        setEdges((eds) => eds.filter((e) => e.id !== id));
        void messageApi.success(t("dag.edgeDeleted"));
        return;
      }
      const status: EdgeStatus = key === "reset" ? "default" : (key as EdgeStatus);
      applyEdgeStatus(setEdges, id, status);
    },
    [contextMenu, closeContextMenu, onOpenNodeEdit, setNodes, setEdges, messageApi, t],
  );

  return {
    contextMenu,
    closeContextMenu,
    onNodeContextMenu,
    onEdgeContextMenu,
    nodeMenuItems,
    edgeMenuItems,
    handleMenuClick,
  };
}

interface UseBottomPanelOpts {
  flowRef: React.RefObject<HTMLDivElement | null>;
}

export function useBottomPanel({ flowRef }: UseBottomPanelOpts) {
  const [bottomPanelNode, setBottomPanelNode] = useState<Node | null>(null);
  const [bottomPanelHeight, setBottomPanelHeight] = useState(480);
  const [isResizing, setIsResizing] = useState(false);
  const dragging = useRef(false);
  const dragStartY = useRef(0);
  const dragStartH = useRef(0);

  const onResizeMouseDown = useCallback(
    (e: React.MouseEvent) => {
      dragging.current = true;
      setIsResizing(true);
      dragStartY.current = e.clientY;
      dragStartH.current = bottomPanelHeight;
      document.body.style.cursor = "row-resize";
      document.body.style.userSelect = "none";
    },
    [bottomPanelHeight],
  );

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const delta = dragStartY.current - e.clientY;
      const containerHeight = flowRef.current?.parentElement?.clientHeight ?? window.innerHeight;
      setBottomPanelHeight(Math.max(150, Math.min(dragStartH.current + delta, containerHeight - 60)));
    };
    const onMouseUp = () => {
      if (!dragging.current) return;
      dragging.current = false;
      setIsResizing(false);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, [flowRef]);

  const closeBottomPanel = useCallback(() => setBottomPanelNode(null), []);

  return {
    bottomPanelNode,
    setBottomPanelNode,
    closeBottomPanel,
    bottomPanelHeight,
    isResizing,
    onResizeMouseDown,
  };
}

interface UseNodeEditModalOpts {
  nodes: Node[];
  setNodes: Dispatch<SetStateAction<Node[]>>;
  messageApi: MessageInstance;
}

export function useNodeEditModal({ nodes, setNodes, messageApi }: UseNodeEditModalOpts) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [editingNode, setEditingNode] = useState<Node | null>(null);
  const [form] = Form.useForm();

  const openEditModal = useCallback(
    (nodeId: string) => {
      const node = nodes.find((n) => n.id === nodeId);
      if (!node) return;
      setEditingNode(node);
      form.setFieldsValue({
        label: node.data.label,
        description: node.data.description || "",
        priority: node.data.priority || "medium",
      });
      setOpen(true);
    },
    [nodes, form],
  );

  const handleSave = useCallback(() => {
    if (!editingNode) return;
    const values = form.getFieldsValue();
    setNodes((nds) =>
      nds.map((n) =>
        n.id === editingNode.id
          ? {
              ...n,
              data: { ...n.data, label: values.label, description: values.description, priority: values.priority },
            }
          : n,
      ),
    );
    setOpen(false);
    setEditingNode(null);
    void messageApi.success(t("dag.nodeUpdated"));
  }, [editingNode, form, setNodes, messageApi, t]);

  const handleCancel = useCallback(() => {
    setOpen(false);
    setEditingNode(null);
  }, []);

  return { open, form, openEditModal, handleSave, handleCancel };
}

interface UseDragAndDropOpts {
  reactFlowInstance: ReactFlowInstance | null;
  workflowId: string;
  setNodes: Dispatch<SetStateAction<Node[]>>;
}

export function useDragAndDrop({ reactFlowInstance, workflowId, setNodes }: UseDragAndDropOpts) {
  const [nodeCount, setNodeCount] = useState(4);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const taskType = event.dataTransfer.getData("application/reactflow-type");
      const taskLabel = event.dataTransfer.getData("application/reactflow-label");
      if (!taskType || !taskLabel || !reactFlowInstance) return;
      const position = reactFlowInstance.screenToFlowPosition({ x: event.clientX, y: event.clientY });
      const newNode: Node = {
        id: `${workflowId}-task${nodeCount + 1}`,
        type: "taskNode",
        data: {
          label: `${taskLabel} ${nodeCount + 1}`,
          nodeType: "task",
          taskType,
          description: "",
          priority: "medium",
        },
        position,
      };
      setNodes((nds) => [...nds, newNode]);
      setNodeCount((count) => count + 1);
    },
    [reactFlowInstance, workflowId, nodeCount, setNodes],
  );

  return { onDragOver, onDrop };
}
