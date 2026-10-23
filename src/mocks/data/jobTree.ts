import { faker } from "@faker-js/faker";
import type { JobTreeNode, JobStatus, WorkflowLifecycleStatus } from "@/types/job";
import type { JobType } from "@/constants/enums";

/**
 * Shared in-memory mock store mirroring the backend's `job_group` (folders) and
 * `job_tree` (leaf placements: task/workflow definitions) tables.
 *
 * `jobGroupStore` holds ONLY group rows (id/name/pid) — no children, no leaf
 * fields. `jobTreeStore` holds ONLY leaf placements, keyed by node id, each
 * carrying its own `pid` (the group it's placed under). Group listings
 * (`listRoots`/`listChildren`) are derived on read by joining the two stores,
 * the same way a backend would query `job_group` and `job_tree` separately.
 */

export interface GroupRow {
  id: string;
  name: string;
  pid: string;
}

export const jobGroupStore = new Map<string, GroupRow>();
export const jobTreeStore = new Map<string, JobTreeNode>();

// Group name + how many leaves to seed. One oversized group stress-tests virtual scrolling.
const GROUP_SPECS: { name: string; size: number }[] = [
  { name: "数据采集", size: 1200 },
  { name: "数据处理", size: 350 },
  { name: "实时计算", size: 600 },
  { name: "机器学习", size: 15 },
  { name: "报表生成", size: 8 },
];

let leafRefSeq = 0;
let seeded = false;

/** Shared numeric ids for seeded and newly created mock definitions. */
export function nextDefinitionRef(): number {
  return ++leafRefSeq;
}

function seedLeaf(gi: number, groupId: string): JobTreeNode {
  const isWorkflow = faker.datatype.boolean();
  const jobType = faker.helpers.arrayElement<JobType>(["MYSQL_SQL", "SHELL", "FLINK_SQL", "FLINK_JAR"]);
  return {
    id: isWorkflow ? `wf-${faker.string.nanoid(6)}` : `task-${faker.string.nanoid(6)}`,
    name: isWorkflow
      ? faker.helpers.arrayElement(["日报汇总", "数据同步流程", "ETL Pipeline", "报表生成流程"]) +
        ` ${gi}-${faker.number.int({ min: 1, max: 99 })}`
      : faker.helpers.arrayElement([
          "MySQL 数据同步",
          "Kafka 消费任务",
          "Spark ETL 日报",
          "Shell 清理脚本",
          "Hive 分区整理",
          "Flink CDC 实时同步",
        ]) + ` ${gi}-${faker.number.int({ min: 1, max: 99 })}`,
    kind: isWorkflow ? "workflow" : "task",
    jobType: isWorkflow ? undefined : jobType,
    refId: nextDefinitionRef(),
    pid: groupId,
    // Latest-run status (run outcome), shown as an icon on the definition node.
    status: faker.helpers.arrayElement(["success", "failed", "running", "pending", "stopped"] as JobStatus[]),
    lifecycleStatus: faker.helpers.arrayElement(["OFFLINE", "ONLINE", "SCHEDULING"] as WorkflowLifecycleStatus[]),
    tags: faker.helpers.arrayElements(["etl", "daily", "hourly", "critical", "adhoc"], { min: 0, max: 2 }),
  };
}

/** Idempotent seed — safe to call at module load; subsequent calls are no-ops. */
export function seedTree(): void {
  if (seeded) return;
  seeded = true;

  GROUP_SPECS.forEach(({ name, size }, gi) => {
    const groupId = `g-${faker.string.nanoid(6)}`;
    jobGroupStore.set(groupId, { id: groupId, name, pid: "" });
    for (let i = 0; i < size; i++) {
      const leaf = seedLeaf(gi, groupId);
      jobTreeStore.set(leaf.id, leaf);
    }

    // The first top-level group also gets a subgroup holding a handful of
    // leaves, so tree-navigation (subgroup expand, nesting-rejection) has a
    // real subgroup to exercise.
    if (gi === 0) {
      const subGroupId = `g-${faker.string.nanoid(6)}`;
      jobGroupStore.set(subGroupId, { id: subGroupId, name: `${name}-子分组`, pid: groupId });
      for (let i = 0; i < 5; i++) {
        const leaf = seedLeaf(gi, subGroupId);
        jobTreeStore.set(leaf.id, leaf);
      }
    }
  });
}

seedTree();

/** Direct member count of a group: subgroups + leaves placed under it. */
function directChildCount(groupId: string): number {
  let count = 0;
  for (const g of jobGroupStore.values()) if (g.pid === groupId) count++;
  for (const n of jobTreeStore.values()) if (n.pid === groupId) count++;
  return count;
}

/** Render a `GroupRow` as a `JobTreeNode` group shell (childCount set, no `children`). */
function groupToNode(row: GroupRow): JobTreeNode {
  return { id: row.id, name: row.name, kind: "group", pid: row.pid, childCount: directChildCount(row.id) };
}

export function isTopLevel(groupId: string): boolean {
  return jobGroupStore.get(groupId)?.pid === "";
}

export function listRoots(): JobTreeNode[] {
  return [...jobGroupStore.values()].filter((g) => g.pid === "").map(groupToNode);
}

export function listChildren(groupId: string): JobTreeNode[] {
  const subgroups = [...jobGroupStore.values()].filter((g) => g.pid === groupId).map(groupToNode);
  const leaves = [...jobTreeStore.values()].filter((n) => n.pid === groupId);
  return [...subgroups, ...leaves];
}

type SearchFilter = { keyword: string; types: string[]; statuses: string[] };

function matchesKeyword(leaf: JobTreeNode, keyword: string): boolean {
  return !keyword || leaf.name.toLowerCase().includes(keyword) || leaf.id.toLowerCase().includes(keyword);
}

function matchesType(leaf: JobTreeNode, types: string[]): boolean {
  // Workflow leaves carry no `jobType` (that's a task-only concept); fall back
  // to `kind` so the "FLOW" filter (value "workflow") can still match them.
  const typeKey = leaf.jobType ?? leaf.kind;
  return types.length === 0 || types.includes(typeKey);
}

function matchesStatus(leaf: JobTreeNode, statuses: string[]): boolean {
  return statuses.length === 0 || (leaf.status ? statuses.includes(leaf.status) : false);
}

function matchesLeaf(leaf: JobTreeNode, filter: SearchFilter): boolean {
  return (
    matchesKeyword(leaf, filter.keyword) && matchesType(leaf, filter.types) && matchesStatus(leaf, filter.statuses)
  );
}

export function searchTree(p: { keyword?: string; types?: string[]; statuses?: string[] }): JobTreeNode[] {
  const filter: SearchFilter = {
    keyword: (p.keyword ?? "").toLowerCase().trim(),
    // Task types are backend JobType values (e.g. FLINK_SQL) and are matched
    // case-sensitively — unlike keyword/status, they must not be lowercased.
    types: p.types ?? [],
    statuses: (p.statuses ?? []).map((s) => s.toLowerCase()),
  };

  const matchedByParent = new Map<string, JobTreeNode[]>();
  for (const leaf of jobTreeStore.values()) {
    if (!matchesLeaf(leaf, filter)) continue;
    const list = matchedByParent.get(leaf.pid) ?? [];
    list.push(leaf);
    matchedByParent.set(leaf.pid, list);
  }

  const results: JobTreeNode[] = [];
  for (const [pid, leaves] of matchedByParent) {
    const group = jobGroupStore.get(pid);
    if (!group) continue;
    results.push({ ...groupToNode(group), children: leaves });
  }
  return results;
}

/** Create a group row. Nesting beyond one level is rejected (backend model is 2-level: top group > subgroup). */
export function createGroupRow(name: string, pid: string): string {
  if (pid !== "" && jobGroupStore.get(pid)?.pid !== "") {
    throw { code: 1001, desc: "不支持在子分组下创建子分组" };
  }
  const id = `g-${faker.string.nanoid(6)}`;
  jobGroupStore.set(id, { id, name, pid });
  return id;
}

export function renameGroupRow(id: string, name: string): boolean {
  const row = jobGroupStore.get(id);
  if (!row) return false;
  row.name = name;
  return true;
}

/** Delete a group and cascade: its subgroups (recursively) and all leaves placed under any of them. */
export function deleteGroupSubtree(id: string): boolean {
  const row = jobGroupStore.get(id);
  if (!row) return false;

  const subgroupIds = [...jobGroupStore.values()].filter((g) => g.pid === id).map((g) => g.id);
  for (const subId of subgroupIds) {
    deleteGroupSubtree(subId);
  }
  for (const [leafId, leaf] of jobTreeStore) {
    if (leaf.pid === id) jobTreeStore.delete(leafId);
  }
  jobGroupStore.delete(id);
  return true;
}

/** Insert or replace a leaf placement. */
export function recordPlacement(node: JobTreeNode): void {
  jobTreeStore.set(node.id, node);
}

export function renameLeaf(id: string, name: string): boolean {
  const node = jobTreeStore.get(id);
  if (!node) return false;
  node.name = name;
  return true;
}

export function deleteLeaf(id: string): boolean {
  return jobTreeStore.delete(id);
}
