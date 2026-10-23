import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ConfigProvider, Flex, Modal, Skeleton, Tooltip, Tree, message } from "antd";
import { DownOutlined, EllipsisOutlined } from "@ant-design/icons";
import type { MenuProps, ThemeConfig, TreeDataNode } from "antd";
import { compactMenuTheme, DATA_FONT_SIZE } from "@/theme";
import type { MessageInstance } from "antd/es/message/interface";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import { useJobStore } from "@/stores/jobStore";
import { findNodeById } from "@/utils/tree";
import type { JobTreeNode } from "@/types/job";
import { TaskIcon } from "@/components/TaskIcon";
import { LIFECYCLE_STATUS_COLORS } from "@/constants/lifecycleStatusColors";
import { LIFECYCLE_LABEL_KEY } from "./lifecycle";
import { RunStatusIcon } from "./RunStatusIcon";
import { buildNodeMenuItems } from "./nodeMenu";
import { performDelete } from "./performDelete";
import { useDefinitionLifecycle } from "./useDefinitionLifecycle";
import { TagEditModal } from "./TagEditModal";
import { GroupEditModal } from "./GroupEditModal";
import GroupCreateModal from "./GroupCreateModal";
import JobTreeContextMenu from "./JobTreeContextMenu";
import { WorkflowCreateModal } from "./WorkflowCreateModal";
import "./JobTree.css";

// ---------- constants & icons ----------

// Tree density knobs — tweak these three to taste.
const NODE_FONT_SIZE = DATA_FONT_SIZE;
const NODE_ROW_HEIGHT = 30; // row height == line spacing (virtual-scroll item height)
const ICON_SIZE = 18; // leaf type-icon size

const jobTreeStyles = {
  root: { color: "var(--ant-color-text-secondary)" },
  itemTitle: { flex: 1, minWidth: 0 },
} as const;
const treeSkeletonProps = {
  active: true,
  title: false,
  paragraph: { rows: 4, width: ["72%", "58%", "66%", "48%"] },
  style: { padding: "4px 8px" },
};

/** Tree row density/typography, layered on top of the compact menu theme. */
const jobTreeTheme: ThemeConfig = {
  ...compactMenuTheme,
  components: {
    ...compactMenuTheme.components,
    Tree: { titleHeight: NODE_ROW_HEIGHT, fontSize: NODE_FONT_SIZE },
  },
};

const moreButtonStyle: React.CSSProperties = {
  fontSize: 14,
  width: 28,
  height: 28,
  padding: 0,
  cursor: "pointer",
  color: "var(--ant-color-text-tertiary)",
  background: "transparent",
  border: 0,
};

function menuPosition(event: React.MouseEvent): { x: number; y: number } {
  if (event.detail !== 0) return { x: event.clientX, y: event.clientY };
  const bounds = event.currentTarget.getBoundingClientRect();
  return { x: bounds.right, y: bounds.bottom };
}

function JobTreeNodeIcon({ node }: { node: JobTreeNode }) {
  const { t } = useTranslation();
  const type = node.jobType ?? node.kind;
  const status = node.lifecycleStatus;
  const statusLabel = status ? t(LIFECYCLE_LABEL_KEY[status]) : undefined;
  const typeLabel = node.jobType ? t(`enums.JobType.${node.jobType}`) : type;
  const icon = (
    <TaskIcon
      type={type}
      size={ICON_SIZE}
      color={status ? LIFECYCLE_STATUS_COLORS[status] : undefined}
      label={statusLabel ? `${typeLabel} · ${statusLabel}` : typeLabel}
    />
  );
  return statusLabel ? (
    <Tooltip title={`${t("definitions.schedulingStatus")}: ${statusLabel}`}>
      <span style={{ display: "inline-flex", width: ICON_SIZE, height: ICON_SIZE }}>{icon}</span>
    </Tooltip>
  ) : (
    icon
  );
}

// ---------- utils ----------

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ---------- node title ----------

interface JobTreeNodeTitleProps {
  displayName: string;
  node: JobTreeNode;
  count?: number;
  onMore: (event: React.MouseEvent, node: JobTreeNode) => void;
}

// Memoized so unchanged rows skip re-render when the tree data is rebuilt.
// The "..." button opens a single shared menu (see contextMenu) instead of
// mounting an antd Dropdown per row and building its items eagerly.
const JobTreeNodeTitle = React.memo(function JobTreeNodeTitle({
  displayName,
  node,
  count,
  onMore,
}: JobTreeNodeTitleProps) {
  const { t } = useTranslation();
  const lastRunLabel =
    node.kind === "group"
      ? undefined
      : `${t("jobStatus.lastRun")}: ${node.status ? t(`jobStatus.${node.status}`) : t("jobStatus.neverRun")}`;
  return (
    <Flex align="center" justify="space-between" className="job-tree-title">
      <span
        title={lastRunLabel ? `${displayName} · ${lastRunLabel}` : displayName}
        style={{
          flex: 1,
          minWidth: 0,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          fontSize: NODE_FONT_SIZE,
        }}
      >
        {displayName}
      </span>
      <span className="job-tree-trailing">
        <span className="job-tree-trailing-status">
          {typeof count === "number" && count > 0 ? (
            <span style={{ fontSize: NODE_FONT_SIZE - 1, color: "var(--ant-color-text-tertiary)" }}>{count}</span>
          ) : node.kind !== "group" ? (
            <RunStatusIcon status={node.status} />
          ) : null}
        </span>
        <button
          type="button"
          className="job-tree-more"
          style={moreButtonStyle}
          aria-label={`${t("common.operation")}: ${displayName}`}
          onClick={(e) => onMore(e, node)}
        >
          <EllipsisOutlined aria-hidden />
        </button>
      </span>
    </Flex>
  );
});

// ---------- hooks: data ----------

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  node: JobTreeNode | null;
}

const INITIAL_CTX: ContextMenuState = { visible: false, x: 0, y: 0, node: null };

function useTreeFetching(searchKeyword: string, typeFilter: string[], statusFilter: string[]) {
  const fetchTree = useJobStore((s) => s.fetchTree);
  const searchTree = useJobStore((s) => s.searchTree);
  const hasSearch = searchKeyword.trim() !== "" || typeFilter.length > 0 || statusFilter.length > 0;

  useEffect(() => {
    void fetchTree();
  }, [fetchTree]);

  useEffect(() => {
    if (!hasSearch) return;
    const timer = setTimeout(() => void searchTree(searchKeyword.trim(), typeFilter, statusFilter), 300);
    return () => clearTimeout(timer);
  }, [searchKeyword, typeFilter, statusFilter, searchTree, hasSearch]);

  const hadSearchRef = useRef(false);
  useEffect(() => {
    if (hasSearch) hadSearchRef.current = true;
    else if (hadSearchRef.current) {
      hadSearchRef.current = false;
      void fetchTree();
    }
  }, [hasSearch, fetchTree]);
}

function useTreeExpansion() {
  const loadedGroups = useJobStore((s) => s.loadedGroups);
  const fetchGroupChildren = useJobStore((s) => s.fetchGroupChildren);
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);

  useEffect(() => {
    return useJobStore.subscribe((state, prev) => {
      if (state.searchExpandedKeys && state.searchExpandedKeys !== prev.searchExpandedKeys) {
        setExpandedKeys(state.searchExpandedKeys);
      }
    });
  }, []);

  const handleExpand = useCallback(
    (keys: React.Key[]) => {
      const newKeys = keys.filter((k) => !expandedKeys.includes(k));
      setExpandedKeys(keys);
      for (const key of newKeys) {
        const groupId = String(key);
        if (!loadedGroups.has(groupId)) void fetchGroupChildren(groupId);
      }
    },
    [expandedKeys, loadedGroups, fetchGroupChildren],
  );

  return { expandedKeys, setExpandedKeys, loadedGroups, fetchGroupChildren, handleExpand };
}

function useContextMenu(treeData: JobTreeNode[]) {
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(INITIAL_CTX);

  useEffect(() => {
    if (!contextMenu.visible) return;
    const handler = () => setContextMenu((prev) => ({ ...prev, visible: false }));
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [contextMenu.visible]);

  const handleRightClick = useCallback(
    ({ event, node: treeNode }: { event: React.MouseEvent; node: TreeDataNode }) => {
      event.preventDefault();
      event.stopPropagation();
      const found = findNodeById(treeData, String(treeNode.key));
      if (found) setContextMenu({ visible: true, x: event.clientX, y: event.clientY, node: found });
    },
    [treeData],
  );

  return { contextMenu, setContextMenu, handleRightClick };
}

function useJobTreeData({
  searchKeyword,
  typeFilter,
  statusFilter,
}: {
  searchKeyword: string;
  typeFilter: string[];
  statusFilter: string[];
}) {
  const treeData = useJobStore((s) => s.treeData);
  const selectNode = useJobStore((s) => s.selectNode);

  useTreeFetching(searchKeyword, typeFilter, statusFilter);
  const { expandedKeys, setExpandedKeys, loadedGroups, fetchGroupChildren, handleExpand } = useTreeExpansion();
  const { contextMenu, setContextMenu, handleRightClick } = useContextMenu(treeData);

  const handleSelect = useCallback(
    (selectedKeys: React.Key[]) => {
      if (selectedKeys.length === 0) return;
      const nodeId = String(selectedKeys[0]);
      const node = findNodeById(treeData, nodeId);
      if (!node) return;
      if (node.kind !== "group") {
        void selectNode(node);
        return;
      }
      const isExpanding = !expandedKeys.includes(nodeId);
      setExpandedKeys((prev) => (prev.includes(nodeId) ? prev.filter((k) => k !== nodeId) : [...prev, nodeId]));
      if (isExpanding && !loadedGroups.has(nodeId)) void fetchGroupChildren(nodeId);
    },
    [treeData, expandedKeys, setExpandedKeys, loadedGroups, fetchGroupChildren, selectNode],
  );

  return { expandedKeys, contextMenu, setContextMenu, handleSelect, handleRightClick, handleExpand };
}

// ---------- hooks: actions ----------

function buildDeleteContent(node: JobTreeNode, t: (k: string, opts?: Record<string, unknown>) => string): string {
  if (node.kind === "group") {
    const count = node.children?.length ?? 0;
    return count > 0
      ? t("workflow.confirmDeleteGroup", { name: node.name, count })
      : t("workflow.confirmDeleteGroupEmpty", { name: node.name });
  }
  return node.kind === "task"
    ? t("workflow.confirmDeleteTask", { name: node.name })
    : t("workflow.confirmDeleteWorkflow", { name: node.name });
}

function useJobTreeActions({ messageApi }: { messageApi: MessageInstance }) {
  const { t } = useTranslation();
  const addNode = useJobStore((s) => s.addNode);
  const createWorkflow = useJobStore((s) => s.createWorkflow);
  const deleteNode = useJobStore((s) => s.deleteNode);
  const [workflowParentId, setWorkflowParentId] = useState<string | null>(null);
  const [creatingWorkflow, setCreatingWorkflow] = useState(false);
  const [groupParentId, setGroupParentId] = useState<string | null>(null);

  const handleAddWorkflow = useCallback((parentId: string) => setWorkflowParentId(parentId), []);
  const handleCreateWorkflow = useCallback(
    async (name: string) => {
      if (!workflowParentId) return;
      setCreatingWorkflow(true);
      try {
        await createWorkflow(name, workflowParentId);
        setWorkflowParentId(null);
        void messageApi.success(t("workflowForm.saveSuccess"));
      } finally {
        setCreatingWorkflow(false);
      }
    },
    [createWorkflow, messageApi, t, workflowParentId],
  );
  const handleAddTask = useCallback(
    (parentId: string) => addNode({ id: generateId("task"), name: t("workflow.newTask"), kind: "task", pid: parentId }),
    [addNode, t],
  );
  const handleAddSubgroup = useCallback((parentId: string) => setGroupParentId(parentId), []);

  const handleDelete = useCallback(
    (node: JobTreeNode) => {
      Modal.confirm({
        title: t("workflow.confirmDelete"),
        content: buildDeleteContent(node, t),
        okText: t("common.delete"),
        okType: "danger",
        cancelText: t("common.cancel"),
        onOk: () => performDelete(node, deleteNode, messageApi, t),
      });
    },
    [deleteNode, messageApi, t],
  );

  return {
    handleAddWorkflow,
    handleAddTask,
    handleAddSubgroup,
    handleDelete,
    workflowParentId,
    creatingWorkflow,
    handleCreateWorkflow,
    closeWorkflowCreate: () => setWorkflowParentId(null),
    groupParentId,
    closeGroupCreate: () => setGroupParentId(null),
  };
}

/** Builds the per-node menu and routes clicks to the right action/handler. */
function useMenuActions({
  t,
  actions,
  handleLifecycle,
  setRenameNode,
}: {
  t: TFunction;
  actions: Pick<
    ReturnType<typeof useJobTreeActions>,
    "handleAddWorkflow" | "handleAddTask" | "handleAddSubgroup" | "handleDelete"
  >;
  handleLifecycle: (key: string, node: JobTreeNode) => Promise<void> | void;
  setRenameNode: (node: JobTreeNode) => void;
}) {
  const { handleAddWorkflow, handleAddTask, handleAddSubgroup, handleDelete } = actions;
  const getMenuItems = useCallback((node: JobTreeNode): MenuProps["items"] => buildNodeMenuItems(node, t), [t]);
  const handleMenuAction = useCallback(
    (key: string, node: JobTreeNode) => {
      if (key === "addWorkflow") handleAddWorkflow(node.id);
      else if (key === "addTask") handleAddTask(node.id);
      else if (key === "addSubgroup") handleAddSubgroup(node.id);
      else if (key === "rename") setRenameNode(node);
      else if (key === "delete") handleDelete(node);
      else void handleLifecycle(key, node);
    },
    [handleAddWorkflow, handleAddTask, handleAddSubgroup, handleDelete, handleLifecycle, setRenameNode],
  );
  return { getMenuItems, handleMenuAction };
}

// ---------- hooks: tree data mapping ----------

function useBuiltTreeData(onMore: (event: React.MouseEvent, node: JobTreeNode) => void): TreeDataNode[] {
  const treeData = useJobStore((s) => s.treeData);
  const loadingGroups = useJobStore((s) => s.loadingGroups);
  const loadedGroups = useJobStore((s) => s.loadedGroups);

  return useMemo<TreeDataNode[]>(() => {
    // Recurse to any depth: only `group` nodes are expandable (with lazy-loaded
    // children); everything else is a leaf. Groups and leaves may be siblings.
    const buildNode = (node: JobTreeNode): TreeDataNode => {
      const title = (
        <JobTreeNodeTitle
          displayName={loadingGroups.has(node.id) ? `${node.name} ...` : node.name}
          node={node}
          count={node.kind === "group" ? (node.childCount ?? node.children?.length) : undefined}
          onMore={onMore}
        />
      );
      if (node.kind !== "group") {
        return { key: node.id, title, icon: <JobTreeNodeIcon node={node} />, isLeaf: true };
      }
      // Show the expand arrow before children are fetched; map them once loaded.
      const loaded = loadedGroups.has(node.id) || Boolean(node.children?.length);
      return {
        key: node.id,
        title,
        icon: undefined,
        isLeaf: false,
        children: loaded ? node.children?.map(buildNode) : undefined,
      };
    };
    return (Array.isArray(treeData) ? treeData : []).map(buildNode);
  }, [treeData, loadingGroups, loadedGroups, onMore]);
}

// ---------- hooks: virtual-scroll height ----------

/** Track a container's height so the Tree can virtualize (only visible rows render). */
function useContainerHeight() {
  const ref = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(400);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const h = entries[0]?.contentRect.height;
      if (h) setHeight(h);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, height };
}

// ---------- component ----------

interface JobTreeProps {
  searchKeyword?: string;
  typeFilter?: string[];
  statusFilter?: string[];
}

const EMPTY_FILTER: string[] = [];

export default function JobTree({
  searchKeyword = "",
  typeFilter = EMPTY_FILTER,
  statusFilter = EMPTY_FILTER,
}: JobTreeProps) {
  const selectedNode = useJobStore((s) => s.selectedNode);
  const treeLoading = useJobStore((s) => s.treeLoading);
  const { t } = useTranslation();

  const [messageApi, contextHolder] = message.useMessage();

  const { expandedKeys, contextMenu, setContextMenu, handleSelect, handleRightClick, handleExpand } = useJobTreeData({
    searchKeyword,
    typeFilter,
    statusFilter,
  });
  const actions = useJobTreeActions({ messageApi });
  const lifecycle = useDefinitionLifecycle(messageApi);
  const [renameNode, setRenameNode] = useState<JobTreeNode | null>(null);

  const { getMenuItems, handleMenuAction } = useMenuActions({
    t,
    actions,
    handleLifecycle: lifecycle.handleLifecycle,
    setRenameNode,
  });

  const onMore = useCallback(
    (event: React.MouseEvent, node: JobTreeNode) => {
      event.stopPropagation();
      setContextMenu({ visible: true, ...menuPosition(event), node });
    },
    [setContextMenu],
  );

  const builtTreeData = useBuiltTreeData(onMore);
  const { ref: containerRef, height } = useContainerHeight();

  return (
    <ConfigProvider theme={jobTreeTheme}>
      {contextHolder}
      <div ref={containerRef} style={{ height: "100%", minHeight: 0 }} aria-busy={treeLoading}>
        <Skeleton {...treeSkeletonProps} loading={treeLoading && builtTreeData.length === 0}>
          <Tree
            className="job-tree-wrapper"
            styles={jobTreeStyles}
            showIcon
            showLine
            blockNode
            virtual
            height={height}
            switcherIcon={<DownOutlined />}
            expandedKeys={expandedKeys}
            onExpand={handleExpand}
            selectedKeys={selectedNode ? [selectedNode.id] : []}
            onSelect={handleSelect}
            onRightClick={handleRightClick}
            treeData={builtTreeData}
          />
        </Skeleton>
      </div>
      <JobTreeContextMenu
        state={contextMenu}
        getMenuItems={getMenuItems}
        onAction={(key, node) => {
          handleMenuAction(key, node);
          setContextMenu((prev) => ({ ...prev, visible: false }));
        }}
      />
      <LifecycleModals lifecycle={lifecycle} />
      <GroupRenameModal node={renameNode} onClose={() => setRenameNode(null)} />
      <GroupCreateModal
        open={!!actions.groupParentId}
        parentId={actions.groupParentId ?? ""}
        onClose={actions.closeGroupCreate}
      />
      <WorkflowCreateModal
        open={!!actions.workflowParentId}
        confirmLoading={actions.creatingWorkflow}
        onOk={actions.handleCreateWorkflow}
        onCancel={actions.closeWorkflowCreate}
      />
    </ConfigProvider>
  );
}

/** Names of a node's same-level groups (excluding itself), for duplicate checks. */
function groupSiblingNames(treeData: JobTreeNode[], node: JobTreeNode): string[] {
  const siblings = node.pid ? (findNodeById(treeData, node.pid)?.children ?? []) : treeData;
  return siblings.filter((n) => n.kind === "group" && n.id !== node.id).map((n) => n.name);
}

/** Rename modal for a group node; reads the store so JobTree only holds the target. */
function GroupRenameModal({ node, onClose }: { node: JobTreeNode | null; onClose: () => void }) {
  const treeData = useJobStore((s) => s.treeData);
  const renameNode = useJobStore((s) => s.renameNode);
  return (
    <GroupEditModal
      open={!!node}
      mode="rename"
      initialName={node?.name}
      siblingNames={node ? groupSiblingNames(treeData, node) : undefined}
      onOk={(name) => {
        if (node) void renameNode(node, name);
        onClose();
      }}
      onCancel={onClose}
    />
  );
}

function LifecycleModals({ lifecycle }: { lifecycle: ReturnType<typeof useDefinitionLifecycle> }) {
  return (
    <TagEditModal
      open={!!lifecycle.tagNode}
      value={lifecycle.tagNode?.tags ?? []}
      confirmLoading={lifecycle.saving}
      onOk={lifecycle.saveTags}
      onCancel={lifecycle.closeTag}
    />
  );
}
