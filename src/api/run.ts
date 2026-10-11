import { http } from "@/utils/request";
import type { RunLog, FlowRun, FlowRunDetail, FlowRunListParams } from "@/types/run";
import { ipageToPaginated, toPageParams, type IPage, type PaginatedResponse } from "@/types/common";
import {
  adaptFlowRun,
  adaptFlowRunDetail,
  adaptRunLog,
  type LegacyFlowRunDto,
  type LegacyJobRunDto,
} from "@/api/legacy/contracts";
import { formatLegacyDateTime } from "@/api/legacy/date";

const LEGACY_CLIENT_FILTER_LIMIT = 1_000;

interface FlowRunRequestOptions {
  suppressErrorToast?: boolean;
}

function getLegacyFlowRunPage(params: FlowRunListParams, status = params.status, options?: FlowRunRequestOptions) {
  const needsClientFiltering = Boolean(params.flowId || params.type);
  return http.get<IPage<LegacyFlowRunDto>>("/jobFlowRun/page", {
    suppressErrorToast: options?.suppressErrorToast,
    params: {
      ...toPageParams({
        page: needsClientFiltering ? 1 : params.page,
        pageSize: needsClientFiltering ? LEGACY_CLIENT_FILTER_LIMIT : params.pageSize,
      }),
      name: params.name,
      status,
      startTime: formatLegacyDateTime(params.startFrom),
      endTime: formatLegacyDateTime(params.startTo),
      sort: "-id",
    },
  });
}

function clientFilter(items: FlowRun[], params: FlowRunListParams): FlowRun[] {
  return items.filter(
    (run) => (!params.flowId || run.flowId === params.flowId) && (!params.type || run.type === params.type),
  );
}

/** Unified list of top-level runs (single-task + composite flow) from `/jobFlowRun/page`. */
export function getFlowRuns(
  params: FlowRunListParams,
  options?: FlowRunRequestOptions,
): Promise<PaginatedResponse<FlowRun>> {
  const statuses = params.statuses?.length ? params.statuses : undefined;
  if (statuses && statuses.length > 1) {
    // The legacy controller accepts only one `status`. Fan out the small
    // semantic buckets used by the dashboard, then merge them for the UI.
    return Promise.all(statuses.map((status) => getLegacyFlowRunPage({ ...params, page: 1 }, status, options))).then(
      (pages) => {
        const all = clientFilter(
          pages
            .flatMap((page) => page.records.map(adaptFlowRun))
            .sort((a, b) => b.startTime.localeCompare(a.startTime)),
          params,
        );
        const start = (params.page - 1) * params.pageSize;
        return {
          data: all.slice(start, start + params.pageSize),
          total: all.length,
          page: params.page,
          pageSize: params.pageSize,
        };
      },
    );
  }

  return getLegacyFlowRunPage(params, statuses?.[0], options).then((page) => {
    const mapped = clientFilter(page.records.map(adaptFlowRun), params);
    if (params.flowId || params.type) {
      const start = (params.page - 1) * params.pageSize;
      return {
        data: mapped.slice(start, start + params.pageSize),
        total: mapped.length,
        page: params.page,
        pageSize: params.pageSize,
      };
    }
    return ipageToPaginated({ ...page, records: mapped });
  });
}

/** Full detail for one flow run, including the graph + node runs. */
export function getFlowRunDetail(id: string): Promise<FlowRunDetail> {
  return Promise.all([
    http.get<LegacyFlowRunDto>(`/jobFlowRun/get/${id}`),
    http.get<IPage<LegacyJobRunDto>>("/jobRun/page", {
      params: { page: 1, size: LEGACY_CLIENT_FILTER_LIMIT, flowRunId: id, sort: "+id" },
    }),
  ]).then(([flow, jobs]) => adaptFlowRunDetail(flow, jobs.records));
}

export function killFlowRun(id: string): Promise<FlowRun> {
  return http
    .get<number>(`/jobFlowRun/kill/${id}`)
    .then(() => http.get<LegacyFlowRunDto>(`/jobFlowRun/get/${id}`).then(adaptFlowRun));
}

/** Log for a single node-level job run. */
export function getJobRunLog(jobRunId: string): Promise<RunLog> {
  return http.get<LegacyJobRunDto>(`/jobRun/get/${jobRunId}`).then(adaptRunLog);
}
