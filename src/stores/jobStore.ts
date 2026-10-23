import { create } from "zustand";
import type { JobTreeNode, WorkflowLifecycleStatus } from "@/types/job";
import type { JobInfo, JobFlow } from "@/types/entities";
import { findNodeById, updateNodeById, removeNodeById, insertChild, collectSubtreeIds } from "@/utils/tree";
import {
  getJobGroups,
  getJobsByGroup,
  searchJobs,
  updateJobTags,
  getJobInfo,
  createJobInfo,
  updateJobInfo,
  createJobGroup,
  renameJobGroup,
  deleteJobGroup,
  renameTreeNode,
  deleteTreeNode,
} from "@/api/job";
import {
  getJobFlow,
  createJobFlow,
  updateJobFlow,
  copyJobFlow,
  startSchedule,
  stopSchedule,
  runFlowOnce,
  updateFlowGraph,
} from "@/api/jobFlow";
import type { FlowGraph } from "@/types/flow";
import { queryClient } from "@/app/queryClient";
import { queryKeys } from "@/api/queryKeys";
import { STORAGE_KEYS } from "@/constants/storage";
import { USE_MOCK_DEFINITION_GROUPS } from "@/config";

type MockTaskSettings = Pick<JobFlow, "cronExpr" | "config" | "priority" | "timeout" | "alerts">;
type MockTaskJobInfo = JobInfo & { mockDefinitionSettings?: MockTaskSettings };

function taskSettingsAsFlow(job: MockTaskJobInfo): JobFlow {
  const settings = job.mockDefinitionSettings;
  return {
    id: job.id,
    name: job.name,
    type: "JOB_FLOW",
    cronExpr: settings?.cronExpr,
    config: settings?.config ?? { parallelism: 1 },
    priority: settings?.priority,
    timeout: settings?.timeout ?? { enable: false },
    alerts: settings?.alerts ?? [],
    params: job.params,
  };
}

export interface OpenTab {
  key: string;
  node: JobTreeNode;
}

export interface WorkflowState {
  treeData: JobTreeNode[];
  selectedNode: JobTreeNode | null;
  treeLoading: boolean;
  loadingGroups: Set<string>;
  loadedGroups: Set<string>;
  searchExpandedKeys: string[] | null;
  openTabs: OpenTab[];
  activeTabKey: string | null;

  fetchTree: () => Promise<void>;
  fetchGroupChildren: (groupId: string) => Promise<void>;
  searchTree: (keyword: string, types: string[], statuses?: string[]) => Promise<void>;
  selectNode: (node: JobTreeNode | null) => Promise<void>;
  addNode: (node: JobTreeNode) => void;
  updateNodeName: (nodeId: string, newName: string) => void;
  patchNode: (nodeId: string, patch: Partial<JobTreeNode>) => void;
  removeNode: (nodeId: string) => void;
  createGroup: (name: string, pid: string) => Promise<void>;
  createWorkflow: (name: string, pid: string) => Promise<void>;
  renameNode: (node: JobTreeNode, name: string) => Promise<void>;
  deleteNode: (node: JobTreeNode) => Promise<void>;
  runOnce: (nodeId: string) => Promise<string>;
  setLifecycleStatus: (nodeId: string, status: WorkflowLifecycleStatus) => Promise<void>;
  copyDefinition: (nodeId: string) => Promise<void>;
  setNodeTags: (nodeId: string, tags: string[]) => Promise<void>;
  openTab: (node: JobTreeNode) => void;
  closeTab: (key: string) => void;
  setActiveTab: (key: string) => void;
  loadJobInfo: (nodeId: string) => Promise<JobInfo | null>;
  saveJobInfo: (nodeId: string, info: JobInfo) => Promise<JobInfo>;
  loadJobFlow: (nodeId: string) => Promise<JobFlow | null>;
  saveJobFlow: (nodeId: string, flow: JobFlow) => Promise<void>;
  saveFlowGraph: (nodeId: string, flow: FlowGraph) => Promise<void>;
}

// Re-exported so existing imports (`@/stores/jobStore`) keep working; the tree
// helpers themselves now live in `@/utils/tree` and are depth-agnostic.
export { findNodeById } from "@/utils/tree";

function persistedNodeId(node: JobTreeNode): string {
  if (node.refId == null) return node.id;
  return `${node.kind === "workflow" ? "flow" : "job"}:${node.refId}`;
}

function removeTreeNodeWithCount(tree: JobTreeNode[], nodeId: string, target: JobTreeNode | null): JobTreeNode[] {
  const withoutNode = removeNodeById(tree, nodeId);
  if (!target?.pid) return withoutNode;
  return updateNodeById(withoutNode, target.pid, (parent) => ({
    ...parent,
    childCount: parent.childCount == null ? undefined : Math.max(0, parent.childCount - 1),
  }));
}

function activeWorkspaceId(): number | null {
  const value = Number(localStorage.getItem(STORAGE_KEYS.workspaceId));
  return Number.isFinite(value) && value > 0 ? value : null;
}

function invalidateDefinitions(): Promise<void> {
  return queryClient.invalidateQueries({ queryKey: queryKeys.definitions.all(activeWorkspaceId()) });
}

export const useJobStore = create<WorkflowState>((set, get) => ({
  treeData: [],
  selectedNode: null,
  treeLoading: false,
  loadingGroups: new Set(),
  loadedGroups: new Set(),
  searchExpandedKeys: null,
  openTabs: [],
  activeTabKey: null,

  fetchTree: async () => {
    set({ treeLoading: true });
    try {
      const workspaceId = activeWorkspaceId();
      const groups = await queryClient.fetchQuery({
        queryKey: queryKeys.definitions.root(workspaceId),
        queryFn: getJobGroups,
      });
      set({ treeData: Array.isArray(groups) ? groups : [], loadedGroups: new Set(), searchExpandedKeys: null });
    } finally {
      set({ treeLoading: false });
    }
  },

  fetchGroupChildren: async (groupId) => {
    const { loadingGroups, loadedGroups } = get();
    if (loadedGroups.has(groupId) || loadingGroups.has(groupId)) return;

    const newLoading = new Set(loadingGroups);
    newLoading.add(groupId);
    set({ loadingGroups: newLoading });

    try {
      const workspaceId = activeWorkspaceId();
      const children = await queryClient.fetchQuery({
        queryKey: queryKeys.definitions.children(workspaceId, groupId),
        queryFn: () => getJobsByGroup(groupId),
      });
      const safeChildren = Array.isArray(children) ? children : [];
      const { treeData, loadingGroups: currentLoading, loadedGroups: currentLoaded } = get();
      const newTree = updateNodeById(treeData, groupId, (group) => ({ ...group, children: safeChildren }));
      const newLoadingSet = new Set(currentLoading);
      newLoadingSet.delete(groupId);
      const newLoadedSet = new Set(currentLoaded);
      newLoadedSet.add(groupId);
      set({ treeData: newTree, loadingGroups: newLoadingSet, loadedGroups: newLoadedSet });
    } catch {
      const { loadingGroups: currentLoading } = get();
      const newLoadingSet = new Set(currentLoading);
      newLoadingSet.delete(groupId);
      set({ loadingGroups: newLoadingSet });
    }
  },

  searchTree: async (keyword, types, statuses) => {
    set({ treeLoading: true });
    try {
      const workspaceId = activeWorkspaceId();
      const results = await queryClient.fetchQuery({
        queryKey: queryKeys.definitions.search(workspaceId, keyword, types, statuses ?? []),
        queryFn: () => searchJobs({ keyword, types, statuses }),
      });
      const list = Array.isArray(results) ? results : [];
      set({
        treeData: list,
        loadedGroups: new Set(list.map((g) => g.id)),
        searchExpandedKeys: list.map((g) => g.id),
      });
    } finally {
      set({ treeLoading: false });
    }
  },

  selectNode: async (node) => {
    set({ selectedNode: node });
    if (!node || node.kind === "group") return;
    get().openTab(node);
  },

  addNode: (node) => {
    const { treeData } = get();
    // A node with no parent (empty `pid`) is a root node; otherwise it is
    // appended to its parent's children, at whatever depth the parent lives.
    if (!node.pid) {
      set({ treeData: [...treeData, node] });
    } else {
      set({ treeData: insertChild(treeData, node.pid, node) });
    }
  },

  updateNodeName: (nodeId, newName) => {
    set({ treeData: updateNodeById(get().treeData, nodeId, (node) => ({ ...node, name: newName })) });
  },

  patchNode: (nodeId, patch) => {
    set((state) => ({
      treeData: updateNodeById(state.treeData, nodeId, (node) => ({ ...node, ...patch })),
      selectedNode: state.selectedNode?.id === nodeId ? { ...state.selectedNode, ...patch } : state.selectedNode,
      openTabs: state.openTabs.map((tab) => (tab.key === nodeId ? { ...tab, node: { ...tab.node, ...patch } } : tab)),
    }));
  },

  runOnce: async (nodeId) => {
    const node = findNodeById(get().treeData, nodeId);
    const flowRunId = await runFlowOnce(node ? persistedNodeId(node) : nodeId);
    // Reflect the triggered run immediately in the node's last-run indicator.
    get().patchNode(nodeId, { status: "running" });
    return String(flowRunId);
  },

  setLifecycleStatus: async (nodeId, status) => {
    const node = findNodeById(get().treeData, nodeId);
    if (node?.kind === "task") {
      const job = await getJobInfo(node.refId ?? nodeId);
      await updateJobInfo({ ...job, status: status === "ONLINE" ? "ONLINE" : "OFFLINE" });
    } else if (status === "SCHEDULING") {
      await startSchedule(node ? persistedNodeId(node) : nodeId);
    } else if (node?.lifecycleStatus === "SCHEDULING") {
      await stopSchedule(persistedNodeId(node));
    } else {
      const flow = await getJobFlow(node?.refId ?? nodeId);
      await updateJobFlow({ ...flow, status });
    }
    await invalidateDefinitions();
    get().patchNode(nodeId, { lifecycleStatus: status });
  },

  copyDefinition: async (nodeId) => {
    // /jobFlow/copy returns only the new id; clone the source tree node under
    // the same parent so the copy appears immediately.
    const src = findNodeById(get().treeData, nodeId);
    const newId = await copyJobFlow(src ? persistedNodeId(src) : nodeId);
    await invalidateDefinitions();
    if (src) {
      get().addNode({ ...src, id: `flow:${newId}`, refId: newId, name: `${src.name}-copy`, children: undefined });
    }
  },

  setNodeTags: async (nodeId, tags) => {
    const node = findNodeById(get().treeData, nodeId);
    await updateJobTags(node ? persistedNodeId(node) : nodeId, tags);
    await invalidateDefinitions();
    get().patchNode(nodeId, { tags });
  },

  removeNode: (nodeId) => {
    const { treeData, selectedNode, openTabs, activeTabKey } = get();
    const target = findNodeById(treeData, nodeId);
    const newTree = removeTreeNodeWithCount(treeData, nodeId, target);
    // Removing a node drops its whole subtree, so tabs/selection for any
    // descendant must be cleaned up too.
    const removedIds = new Set<string>(target ? collectSubtreeIds(target) : [nodeId]);

    const newTabs = openTabs.filter((tab) => !removedIds.has(tab.key));
    const newActiveKey =
      activeTabKey && removedIds.has(activeTabKey) ? (newTabs[newTabs.length - 1]?.key ?? null) : activeTabKey;

    let newSelected = selectedNode;
    if (selectedNode && removedIds.has(selectedNode.id)) {
      newSelected = newActiveKey ? (newTabs.find((t) => t.key === newActiveKey)?.node ?? null) : null;
    }

    set({ treeData: newTree, selectedNode: newSelected, openTabs: newTabs, activeTabKey: newActiveKey });
  },

  createGroup: async (name, pid) => {
    const id = await createJobGroup({ name, pid });
    await invalidateDefinitions();
    get().addNode({ id: String(id), name, kind: "group", pid, children: [] });
  },

  createWorkflow: async (name, pid) => {
    const id = await createJobFlow(
      {
        name,
        type: "JOB_FLOW",
        config: { parallelism: 1 },
        timeout: { enable: false },
      },
      pid,
    );
    await Promise.all([
      invalidateDefinitions(),
      queryClient.invalidateQueries({ queryKey: queryKeys.options(activeWorkspaceId(), "flows", []) }),
    ]);
    const node: JobTreeNode = {
      id: `flow:${id}`,
      refId: id,
      name,
      kind: "workflow",
      pid,
      lifecycleStatus: "OFFLINE",
    };
    get().addNode(node);
    await get().selectNode(node);
  },

  renameNode: async (node, name) => {
    if (node.kind === "group") {
      await renameJobGroup({ id: node.id, name });
    } else {
      await renameTreeNode({ id: persistedNodeId(node), name });
    }
    await invalidateDefinitions();
    get().updateNodeName(node.id, name);
  },

  deleteNode: async (node) => {
    if (node.kind === "group") {
      await deleteJobGroup(node.id);
    } else {
      await deleteTreeNode(persistedNodeId(node));
    }
    await invalidateDefinitions();
    get().removeNode(node.id);
  },

  openTab: (node) => {
    const { openTabs } = get();
    const exists = openTabs.some((tab) => tab.key === node.id);
    if (!exists) {
      set({ openTabs: [...openTabs, { key: node.id, node }], activeTabKey: node.id });
    } else {
      set({ activeTabKey: node.id });
    }
  },

  closeTab: (key) => {
    const { openTabs, activeTabKey } = get();
    const newTabs = openTabs.filter((tab) => tab.key !== key);
    let newActiveKey = activeTabKey;
    if (activeTabKey === key) {
      const closedIndex = openTabs.findIndex((tab) => tab.key === key);
      newActiveKey = newTabs[closedIndex]?.key ?? newTabs[closedIndex - 1]?.key ?? null;
    }
    set({
      openTabs: newTabs,
      activeTabKey: newActiveKey,
      selectedNode: newActiveKey ? (newTabs.find((t) => t.key === newActiveKey)?.node ?? null) : null,
    });
  },

  setActiveTab: (key) => {
    const { openTabs } = get();
    const tab = openTabs.find((t) => t.key === key);
    set({ activeTabKey: key, selectedNode: tab?.node ?? null });
  },

  loadJobInfo: async (nodeId) => {
    const node = findNodeById(get().treeData, nodeId);
    if (node && node.refId == null) return null;
    try {
      const id = String(node?.refId ?? nodeId);
      return await queryClient.fetchQuery({
        queryKey: queryKeys.definitions.job(activeWorkspaceId(), id),
        queryFn: () => getJobInfo(id),
      });
    } catch {
      return null;
    }
  },

  saveJobInfo: async (nodeId, info) => {
    const node = findNodeById(get().treeData, nodeId);
    const saved = info.id ? await updateJobInfo(info) : await createJobInfo(info, node?.pid);
    await invalidateDefinitions();
    const patch: Partial<JobTreeNode> = {
      name: saved.name,
      refId: saved.id,
      jobType: saved.type,
      lifecycleStatus: saved.status,
    };
    if (info.id || saved.id == null) {
      get().patchNode(nodeId, patch);
      return saved;
    }

    const persistedId = `job:${saved.id}`;
    set((state) => {
      const current = findNodeById(state.treeData, nodeId);
      const persistedNode = current ? { ...current, ...patch, id: persistedId } : null;
      return {
        treeData: persistedNode ? updateNodeById(state.treeData, nodeId, () => persistedNode) : state.treeData,
        selectedNode: state.selectedNode?.id === nodeId ? persistedNode : state.selectedNode,
        openTabs: state.openTabs.map((tab) =>
          tab.key === nodeId && persistedNode ? { key: persistedId, node: persistedNode } : tab,
        ),
        activeTabKey: state.activeTabKey === nodeId ? persistedId : state.activeTabKey,
      };
    });
    return saved;
  },

  loadJobFlow: async (nodeId) => {
    const node = findNodeById(get().treeData, nodeId);
    if (node && node.refId == null) return null;
    try {
      const id = String(node?.refId ?? nodeId);
      if (node?.kind === "task") {
        return taskSettingsAsFlow(await getJobInfo(id));
      }
      return await queryClient.fetchQuery({
        queryKey: queryKeys.definitions.flow(activeWorkspaceId(), id),
        queryFn: () => getJobFlow(id),
      });
    } catch {
      return null;
    }
  },

  saveJobFlow: async (nodeId, flow) => {
    const node = findNodeById(get().treeData, nodeId);
    if (node?.kind === "task") {
      if (node.refId == null) throw new Error("Save the task before editing its settings.");
      const job = (await getJobInfo(node.refId)) as MockTaskJobInfo;
      const updated: MockTaskJobInfo = {
        ...job,
        params: flow.params,
        ...(USE_MOCK_DEFINITION_GROUPS
          ? {
              mockDefinitionSettings: {
                cronExpr: flow.cronExpr,
                config: flow.config,
                priority: flow.priority,
                timeout: flow.timeout,
                alerts: flow.alerts,
              },
            }
          : {}),
      };
      await updateJobInfo(updated);
      await invalidateDefinitions();
      return;
    }
    let id = flow.id;
    if (flow.id) {
      await updateJobFlow(flow);
    } else {
      id = await createJobFlow(flow, node?.pid);
    }
    await invalidateDefinitions();
    get().patchNode(nodeId, { name: flow.name, refId: id });
  },

  saveFlowGraph: async (nodeId, flow) => {
    await updateFlowGraph(nodeId, flow);
    await invalidateDefinitions();
  },
}));
