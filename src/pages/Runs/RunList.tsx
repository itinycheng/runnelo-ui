import { useState, useCallback, useMemo } from "react";
import { Button, Popconfirm, Space, Tag, message } from "antd";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { useSearchParams } from "react-router-dom";
import { ProTable, type ProColumns } from "@ant-design/pro-components";
import type { FlowRun, FlowRunListParams } from "@/types/run";
import { getFlowRuns, killFlowRun } from "@/api/run";
import { JOB_FLOW_TYPES, type JobFlowType, type JobType } from "@/constants/enums";
import { getExecStatusOptions, formatDuration, execIsRunning, isFlowType } from "./runStatus";
import { RunStatusTag } from "./RunStatusTag";
import RunDetailDrawer from "./RunDetailDrawer";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { enumColor } from "@/utils/statusColor";
import { queryKeys } from "@/api/queryKeys";

type RunType = JobType | JobFlowType;

function toParams(p: Record<string, unknown>): FlowRunListParams {
  const range = p.startRange as [string, string] | undefined;
  return {
    page: (p.current as number) ?? 1,
    pageSize: (p.pageSize as number) ?? 10,
    name: (p.name as string) || undefined,
    type: (p.type as RunType) || undefined,
    status: (p.status as FlowRunListParams["status"]) || undefined,
    startFrom: range?.[0],
    startTo: range?.[1],
  };
}

const typeLabel = (type: RunType, t: (key: string) => string) =>
  t(`enums.${isFlowType(type) ? "JobFlowType" : "JobType"}.${type}`);

const buildStatusEnum = (t: TFunction) =>
  Object.fromEntries(getExecStatusOptions(t).map((o) => [o.value, { text: o.label }]));

const buildTypeEnum = (t: TFunction) =>
  Object.fromEntries([...JOB_FLOW_TYPES.map((v) => [v, { text: t(`enums.JobFlowType.${v}`) }])]);

function useKillFlowRun() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const workspaceId = useWorkspaceStore((state) => state.currentId);
  const { mutate: killRun } = useMutation({
    mutationFn: killFlowRun,
    onSuccess: async () => {
      message.success(t("runs.killSent"));
      await queryClient.invalidateQueries({ queryKey: ["workspace", workspaceId, "runs"] });
    },
  });
  return useCallback((id: string) => killRun(id), [killRun]);
}

function useRunsPage(initialStatus?: string, initialType?: string) {
  const workspaceId = useWorkspaceStore((state) => state.currentId);
  const [params, setParams] = useState<FlowRunListParams>({
    page: 1,
    pageSize: 10,
    status: initialStatus as FlowRunListParams["status"],
    type: initialType,
  });
  const query = useQuery({
    queryKey: queryKeys.runs.list(workspaceId, params),
    queryFn: () => getFlowRuns(params),
    enabled: workspaceId != null,
    refetchInterval: (state) => (state.state.data?.data.some((run) => execIsRunning(run.status)) ? 5_000 : 30_000),
  });
  return { params, setParams, query };
}

function useRunColumns(openDetail: (id: string) => void, onKill: (id: string) => void) {
  const { t } = useTranslation();
  return useMemo<ProColumns<FlowRun>[]>(
    () => [
      { title: t("common.name"), dataIndex: "name", ellipsis: true },
      {
        title: t("runs.type"),
        dataIndex: "type",
        width: 110,
        valueType: "select",
        valueEnum: buildTypeEnum(t),
        render: (_, row) => <Tag color={enumColor(row.type)}>{typeLabel(row.type, t)}</Tag>,
      },
      {
        title: t("common.status"),
        dataIndex: "status",
        width: 110,
        valueType: "select",
        valueEnum: buildStatusEnum(t),
        render: (_, row) => <RunStatusTag status={row.status} />,
      },
      { title: t("runs.startTime"), dataIndex: "startTime", valueType: "dateTime", search: false, width: 170 },
      {
        title: t("runs.duration"),
        dataIndex: "duration",
        search: false,
        width: 100,
        render: (_, row) => formatDuration(row.duration),
      },
      { title: t("runs.owner"), dataIndex: "submitter", search: false, width: 140 },
      { title: t("runs.startTime"), dataIndex: "startRange", valueType: "dateTimeRange", hideInTable: true },
      {
        title: t("common.operation"),
        valueType: "option",
        width: 130,
        render: (_, record) => (
          <Space>
            <a onClick={() => openDetail(record.id)}>{t("runs.detail")}</a>
            {execIsRunning(record.status) && (
              <Popconfirm
                title={t("runs.killConfirm")}
                onConfirm={() => onKill(record.id)}
                okText={t("common.ok")}
                cancelText={t("common.cancel")}
              >
                <a style={{ color: "var(--ant-color-error)" }}>{t("runs.kill")}</a>
              </Popconfirm>
            )}
          </Space>
        ),
      },
    ],
    [t, openDetail, onKill],
  );
}

export default function RunList() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const runs = useRunsPage(searchParams.get("status") ?? undefined, searchParams.get("type") ?? undefined);

  const openDetail = useCallback((id: string) => {
    setDetailId(id);
    setDetailOpen(true);
  }, []);

  const onKill = useKillFlowRun();

  const columns = useRunColumns(openDetail, onKill);

  return (
    <div data-testid="run-list">
      <ProTable<FlowRun>
        headerTitle={t("runs.title")}
        rowKey="id"
        columns={columns}
        dataSource={runs.query.data?.data ?? []}
        loading={runs.query.isFetching}
        options={{ reload: false, density: false, setting: false }}
        form={{
          initialValues: {
            status: searchParams.get("status") ?? undefined,
            type: searchParams.get("type") ?? undefined,
          },
        }}
        toolBarRender={() => [
          <Button key="refresh" onClick={() => void runs.query.refetch()}>
            {t("common.refresh")}
          </Button>,
        ]}
        onSubmit={(values) => {
          runs.setParams((current) => toParams({ ...values, current: 1, pageSize: current.pageSize }));
        }}
        onReset={() => runs.setParams({ page: 1, pageSize: runs.params.pageSize })}
        pagination={{
          current: runs.params.page,
          pageSize: runs.params.pageSize,
          total: runs.query.data?.total ?? 0,
          showSizeChanger: true,
          onChange: (page, pageSize) => runs.setParams((current) => ({ ...current, page, pageSize })),
        }}
      />
      <RunDetailDrawer runId={detailId} open={detailOpen} onClose={() => setDetailOpen(false)} />
    </div>
  );
}
