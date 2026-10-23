import { http } from "@/utils/request";
import type { JobTreeNode } from "@/types/job";
import type { JobInfo, JobFlow } from "@/types/entities";
import type { IPage } from "@/types/common";
import type { ExecutionStatus } from "@/constants/enums";
import { USE_MOCK_DEFINITION_GROUPS } from "@/config";

export const LEGACY_DEFINITIONS_ROOT_ID = "legacy:definitions";
const LEGACY_DEFINITION_LIMIT = 1_000;

interface LegacyJobDetailsDto extends JobInfo {
  jobRunStatus?: ExecutionStatus;
}

function definitionId(kind: "job" | "flow", id: string | number): string {
  return `${kind}:${id}`;
}

export function definitionRef(id: string | number): string | number {
  const value = String(id);
  const separator = value.indexOf(":");
  return separator < 0 ? id : value.slice(separator + 1);
}

function runStatus(status?: ExecutionStatus): JobTreeNode["status"] {
  if (status === "SUCCESS") return "success";
  if (["FAILURE", "ERROR", "ABNORMAL", "NOT_EXIST", "EXPECTED_FAILURE"].includes(status ?? "")) return "failed";
  if (["SUBMITTED", "RUNNING", "KILLING"].includes(status ?? "")) return "running";
  if (status === "KILLED") return "stopped";
  return "pending";
}

function flowNode(flow: JobFlow): JobTreeNode {
  return {
    id: definitionId("flow", flow.id!),
    refId: flow.id,
    pid: LEGACY_DEFINITIONS_ROOT_ID,
    name: flow.name,
    kind: "workflow",
    lifecycleStatus: flow.status,
    tags: flow.tags,
  };
}

function jobNode(job: LegacyJobDetailsDto): JobTreeNode {
  return {
    id: definitionId("job", job.id!),
    refId: job.id,
    pid: LEGACY_DEFINITIONS_ROOT_ID,
    name: job.name,
    kind: "task",
    jobType: job.type,
    lifecycleStatus: job.status,
    status: runStatus(job.jobRunStatus),
  };
}

async function listDefinitions(keyword?: string): Promise<JobTreeNode[]> {
  const params = { page: 1, size: LEGACY_DEFINITION_LIMIT, name: keyword || undefined, sort: "-id" };
  const [flows, jobs] = await Promise.all([
    http.get<IPage<JobFlow>>("/jobFlow/page", { params }),
    http.get<IPage<LegacyJobDetailsDto>>("/jobInfo/page", { params: { ...params, includeJobRuns: true } }),
  ]);
  return [...flows.records.map(flowNode), ...jobs.records.map(jobNode)];
}

function root(children?: JobTreeNode[]): JobTreeNode {
  return {
    id: LEGACY_DEFINITIONS_ROOT_ID,
    name: "Definitions",
    kind: "group",
    pid: "",
    children,
    childCount: children?.length,
  };
}

/** 获取顶层分组（不含子节点） */
export function getJobGroups(): Promise<JobTreeNode[]> {
  if (USE_MOCK_DEFINITION_GROUPS) return http.get<JobTreeNode[]>("/jobTree/roots");
  return Promise.resolve([root()]);
}

/** 获取指定分组下的直接成员（子分组 + 叶子节点） */
export function getJobsByGroup(groupId: string): Promise<JobTreeNode[]> {
  if (USE_MOCK_DEFINITION_GROUPS) return http.get<JobTreeNode[]>("/jobTree/children", { params: { groupId } });
  return groupId === LEGACY_DEFINITIONS_ROOT_ID ? listDefinitions() : Promise.resolve([]);
}

/** 搜索 Job（服务端，跨所有分组）。数组参数拼成逗号串，避免 axios 默认的 `key[]=` 序列化。 */
export function searchJobs(params: {
  keyword?: string;
  types?: string[];
  statuses?: string[];
}): Promise<JobTreeNode[]> {
  if (USE_MOCK_DEFINITION_GROUPS) {
    return http.get<JobTreeNode[]>("/jobTree/search", {
      params: {
        keyword: params.keyword || undefined,
        types: params.types?.length ? params.types.join(",") : undefined,
        statuses: params.statuses?.length ? params.statuses.join(",") : undefined,
      },
    });
  }
  return listDefinitions(params.keyword).then((nodes) => {
    const selectedTypes = new Set(params.types ?? []);
    const selectedStatuses = new Set(params.statuses ?? []);
    const filtered = nodes.filter((node) => {
      const typeMatch =
        selectedTypes.size === 0 ||
        (node.kind === "workflow" && selectedTypes.has("workflow")) ||
        (node.jobType && selectedTypes.has(node.jobType));
      return typeMatch && (selectedStatuses.size === 0 || (node.status && selectedStatuses.has(node.status)));
    });
    return filtered.length ? [root(filtered)] : [];
  });
}

// ---- Group writes (create/rename/delete) ----

export function createJobGroup(p: { name: string; pid?: string }): Promise<string> {
  if (USE_MOCK_DEFINITION_GROUPS) return http.post<string>("/jobGroup/create", p);
  return Promise.reject(new Error(`The legacy backend does not support definition groups (${p.name}).`));
}

export function renameJobGroup(p: { id: string; name: string }): Promise<string> {
  if (USE_MOCK_DEFINITION_GROUPS) return http.post<string>("/jobGroup/update", p);
  return Promise.reject(new Error(`The legacy backend does not support renaming definition groups (${p.id}).`));
}

export function deleteJobGroup(id: string): Promise<boolean> {
  if (USE_MOCK_DEFINITION_GROUPS) return http.get<boolean>(`/jobGroup/delete/${id}`);
  return Promise.reject(new Error(`The legacy backend does not support deleting definition groups (${id}).`));
}

// ---- Definition lifecycle (Task & Workflow nodes) ----

export function renameTreeNode(p: { id: string; name: string }): Promise<string> {
  if (USE_MOCK_DEFINITION_GROUPS) return http.post<string>("/jobTree/rename", p);
  const id = definitionRef(p.id);
  if (p.id.startsWith("flow:")) {
    return http
      .get<JobFlow>(`/jobFlow/get/${id}`)
      .then((flow) => http.post<number>("/jobFlow/update", { ...flow, name: p.name }).then(() => p.id));
  }
  return http
    .get<JobInfo>(`/jobInfo/get/${id}`)
    .then((job) => http.post<JobInfo>("/jobInfo/update", { ...job, name: p.name }).then(() => p.id));
}

export function deleteTreeNode(id: string): Promise<boolean> {
  if (USE_MOCK_DEFINITION_GROUPS) return http.get<boolean>(`/jobTree/delete/${id}`);
  const ref = definitionRef(id);
  if (id.startsWith("flow:")) {
    return http
      .get<JobFlow>(`/jobFlow/get/${ref}`)
      .then((flow) => http.post<number>("/jobFlow/update", { ...flow, status: "DELETE" }).then(() => true));
  }
  return http.get<boolean>(`/jobInfo/delete/${ref}`);
}

export function updateJobTags(id: string, tags: string[]): Promise<JobTreeNode> {
  if (USE_MOCK_DEFINITION_GROUPS) return http.post<JobTreeNode>("/jobTree/tags", { id, tags });
  const ref = definitionRef(id);
  return http
    .get<JobFlow>(`/jobFlow/get/${ref}`)
    .then((flow) => http.post<number>("/jobFlow/update", { ...flow, tags }).then(() => ({ ...flowNode(flow), tags })));
}

// ---- JobInfo (backend-shaped task entity) ----

export function getJobInfo(id: string | number): Promise<JobInfo> {
  return http.get<JobInfo>(`/jobInfo/get/${definitionRef(id)}`);
}

export function createJobInfo(data: JobInfo, groupId?: string): Promise<JobInfo> {
  return http.post<JobInfo>("/jobInfo/create", USE_MOCK_DEFINITION_GROUPS ? { ...data, groupId } : data);
}

export function updateJobInfo(data: JobInfo): Promise<JobInfo> {
  return http.post<JobInfo>("/jobInfo/update", data);
}

export function getJobInfosByIds(ids: number[]): Promise<JobInfo[]> {
  return ids.length ? http.post<JobInfo[]>("/jobInfo/getByIds", ids) : Promise.resolve([]);
}

/** All task definitions owned by a workflow, including tasks not yet placed in its DAG. */
export function listJobsForFlow(flowId: string | number): Promise<JobInfo[]> {
  return http.get<JobInfo[]>("/jobInfo/list", { params: { flowId: definitionRef(flowId) } });
}
