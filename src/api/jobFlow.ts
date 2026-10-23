import { http } from "@/utils/request";
import type { JobFlow, ExecutionConfig, JobFlowDag, JobInfo } from "@/types/entities";
import type { FlowGraph } from "@/types/flow";
import { definitionRef, getJobInfosByIds, updateJobInfo } from "@/api/job";
import { USE_MOCK_DEFINITION_GROUPS } from "@/config";

function isFlowGraph(flow: JobFlow["flow"]): flow is FlowGraph {
  return !!flow && "nodes" in flow;
}

function legacyToFlowGraph(flow: JobFlowDag | undefined, jobs: JobInfo[]): FlowGraph {
  if (!flow) return { nodes: [], edges: [] };
  const jobsById = new Map(jobs.map((job) => [job.id, job]));
  return {
    nodes: flow.vertices.map((vertex, index) => {
      const job = jobsById.get(vertex.jobId);
      const layout = flow.nodeLayouts?.[vertex.id] ?? {
        id: String(vertex.id),
        type: "taskNode",
        x: 80 + index * 180,
        y: 80,
      };
      return {
        id: String(vertex.id),
        jobId: vertex.jobId,
        taskType: job?.type ?? "SHELL",
        label: job?.name ?? `Job ${vertex.jobId}`,
        description: job?.description,
        config: job?.config as Record<string, unknown> | undefined,
        subject: job?.subject,
        x: layout.x,
        y: layout.y,
      };
    }),
    edges: flow.edges.map((edge, index) => ({
      id: flow.edgeLayouts?.[index]?.id ?? `edge-${edge.fromVId}-${edge.toVId}`,
      source: String(edge.fromVId),
      target: String(edge.toVId),
      status: edge.expectStatus === "FAILURE" ? "failure" : "success",
    })),
  };
}

function flowGraphToLegacy(flow: FlowGraph): JobFlowDag {
  return {
    vertices: flow.nodes.map((node) => ({ id: Number(node.id), jobId: node.jobId!, precondition: "ALL_MATCHED" })),
    edges: flow.edges.map((edge) => ({
      fromVId: Number(edge.source),
      toVId: Number(edge.target),
      expectStatus: edge.status.toUpperCase() === "FAILURE" ? "FAILURE" : "SUCCESS",
    })),
    nodeLayouts: Object.fromEntries(
      flow.nodes.map((node) => [Number(node.id), { id: node.id, type: "taskNode", x: node.x, y: node.y }]),
    ),
    edgeLayouts: Object.fromEntries(flow.edges.map((edge, index) => [index, { id: edge.id }])),
  };
}

async function updateLegacyJobs(flow: FlowGraph): Promise<void> {
  const newNode = flow.nodes.find((node) => node.jobId == null);
  if (newNode) {
    throw new Error(`Task "${newNode.label}" must be created before it can be added to a legacy workflow.`);
  }
  await Promise.all(
    flow.nodes.map(async (node) => {
      const job = await getJobFlowNode(node.jobId!);
      await updateJobInfo({
        ...job,
        name: node.label,
        description: node.description,
        subject: node.subject ?? job.subject,
        config: { ...job.config, ...node.config, type: job.type } as JobInfo["config"],
      });
    }),
  );
}

function getJobFlowNode(jobId: number): Promise<JobInfo> {
  return http.get<JobInfo>(`/jobInfo/get/${jobId}`);
}

/** Fetch a workflow definition by id. */
export function getJobFlow(id: string | number): Promise<JobFlow> {
  return http.get<JobFlow>(`/jobFlow/get/${definitionRef(id)}`);
}

export async function getFlowGraph(id: string | number): Promise<FlowGraph> {
  const jobFlow = await getJobFlow(id);
  if (isFlowGraph(jobFlow.flow)) return jobFlow.flow;
  const jobIds = jobFlow.flow?.vertices.map((vertex) => vertex.jobId) ?? [];
  return legacyToFlowGraph(jobFlow.flow, await getJobInfosByIds(jobIds));
}

/** Create a workflow; the backend returns the new id (not the entity). */
export function createJobFlow(data: JobFlow, groupId?: string): Promise<number> {
  return http.post<number>("/jobFlow/create", USE_MOCK_DEFINITION_GROUPS ? { ...data, groupId } : data);
}

/** Update a workflow's settings; returns its id. */
export function updateJobFlow(data: JobFlow): Promise<number> {
  return http.post<number>("/jobFlow/update", data);
}

/** Duplicate a workflow; returns the new id. */
export function copyJobFlow(id: string | number): Promise<number> {
  return http.get<number>(`/jobFlow/copy/${definitionRef(id)}`);
}

/** Persist only the DAG canvas graph (new-UI FlowGraph). Backend accepts it alongside legacy JobFlowDag. */
export async function updateFlowGraph(id: string | number, flow: FlowGraph): Promise<number> {
  await updateLegacyJobs(flow);
  return http.post<number>("/jobFlow/updateFlow", { id: definitionRef(id), flow: flowGraphToLegacy(flow) });
}

/** Start scheduling (ONLINE → SCHEDULING). */
export function startSchedule(id: string | number): Promise<number> {
  return http.get<number>(`/jobFlow/schedule/start/${definitionRef(id)}`);
}

/** Stop scheduling (SCHEDULING → ONLINE). */
export function stopSchedule(id: string | number): Promise<number> {
  return http.get<number>(`/jobFlow/schedule/stop/${definitionRef(id)}`);
}

/** Trigger one immediate flow run; returns the flow-run id. Optional config overrides (e.g. backfill scheduleTime). */
export function runFlowOnce(id: string | number, config?: ExecutionConfig): Promise<number> {
  return http.post<number>(`/jobFlow/schedule/runOnce/${definitionRef(id)}`, config ?? {});
}

/** Preview the next trigger times using the backend's actual Quartz parser. */
export function previewCron(cron: string): Promise<string[]> {
  return http.get<string[]>("/quartz/parseExpr", { params: { cron }, suppressErrorToast: true });
}
