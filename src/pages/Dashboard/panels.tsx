import { Card, Empty, Flex, Spin, Tag, Typography } from "antd";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { getFlowRuns } from "@/api/run";
import type { FlowRun } from "@/types/run";
import { JOB_FLOW_TYPES, type ExecutionStatus } from "@/constants/enums";
import type { DashboardStats } from "@/api/dashboard";
import { RunStatusTag } from "@/pages/Runs/RunStatusTag";
import { formatDuration, FAILED_EXEC_STATUSES, RUNNING_EXEC_STATUSES } from "@/pages/Runs/runStatus";
import { useQuery } from "@tanstack/react-query";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { queryKeys } from "@/api/queryKeys";
import { STATUS_TOKEN_COLOR } from "@/utils/statusColor";

function CardHeader({ title, onViewAll }: { title: string; onViewAll?: () => void }) {
  const { t } = useTranslation();
  return (
    <Flex justify="space-between" align="center" style={{ marginBottom: 12 }}>
      <Typography.Text strong style={{ fontSize: 15 }}>
        {title}
      </Typography.Text>
      {onViewAll && (
        <Typography.Link style={{ fontSize: 13 }} onClick={onViewAll}>
          {t("dashboard.viewAll")}
        </Typography.Link>
      )}
    </Flex>
  );
}

// ---- Status donut (aggregates all run statuses into 3 buckets + Other) ----

interface DonutSlice {
  status: ExecutionStatus | "";
  name: string;
  value: number;
  color: string;
}

export function StatusDonut({ stats }: { stats: DashboardStats | null }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const total = stats?.totalTasks ?? 0;
  const success = stats?.successTasks ?? 0;
  const failed = stats?.failedTasks ?? 0;
  const running = stats?.runningTasks ?? 0;
  const other = Math.max(0, total - success - failed - running);
  const rate = total ? Math.round((success / total) * 100) : 0;

  const data: DonutSlice[] = [
    { status: "SUCCESS", name: t("dashboard.success"), value: success, color: STATUS_TOKEN_COLOR.success },
    { status: "FAILURE", name: t("dashboard.failed"), value: failed, color: STATUS_TOKEN_COLOR.error },
    { status: "RUNNING", name: t("dashboard.running"), value: running, color: STATUS_TOKEN_COLOR.warning },
    ...(other > 0
      ? [{ status: "" as const, name: t("dashboard.other"), value: other, color: STATUS_TOKEN_COLOR.neutral }]
      : []),
  ];

  return (
    <Card style={{ height: "100%" }}>
      <CardHeader title={t("dashboard.statusBreakdown")} />
      <div style={{ position: "relative" }}>
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={64}
              outerRadius={88}
              paddingAngle={2}
              onClick={(d: { payload?: DonutSlice }) =>
                d.payload?.status && navigate(`/runs?status=${d.payload.status}`)
              }
            >
              {data.map((d) => (
                <Cell key={d.name} fill={d.color} cursor={d.status ? "pointer" : "default"} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
        <Flex
          vertical
          align="center"
          style={{ position: "absolute", inset: 0, top: -24, justifyContent: "center", pointerEvents: "none" }}
        >
          <Typography.Text style={{ fontSize: 30, fontWeight: 600, lineHeight: 1 }}>{rate}%</Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {t("dashboard.successRate")}
          </Typography.Text>
        </Flex>
      </div>
    </Card>
  );
}

// ---- Reusable run list (Recent failures / Running now) ----

type RunListCardStatus = Extract<ExecutionStatus, "FAILURE" | "RUNNING">;

/** The list-card query should cover the whole semantic bucket (all "failed"/"running" statuses),
 * consistent with the tag colors + Kill affordance — not just the single literal status. */
const STATUS_BUCKETS: Record<RunListCardStatus, ExecutionStatus[]> = {
  FAILURE: FAILED_EXEC_STATUSES,
  RUNNING: RUNNING_EXEC_STATUSES,
};

interface RunListCardProps {
  status: RunListCardStatus;
  title: string;
  emptyText: string;
}

export function RunListCard({ status, title, emptyText }: RunListCardProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const workspaceId = useWorkspaceStore((state) => state.currentId);
  const params = { page: 1, pageSize: 6, statuses: STATUS_BUCKETS[status] };
  const { data, isPending: loading } = useQuery({
    queryKey: queryKeys.runs.list(workspaceId, params),
    queryFn: () => getFlowRuns(params),
    enabled: workspaceId != null,
    refetchInterval: status === "RUNNING" ? 5_000 : 30_000,
  });
  const items: FlowRun[] = data?.data ?? [];

  return (
    <Card style={{ height: "100%" }}>
      <CardHeader title={title} onViewAll={() => navigate(`/runs?status=${status}`)} />
      {loading ? (
        <Flex justify="center" style={{ padding: 40 }}>
          <Spin />
        </Flex>
      ) : items.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={emptyText} style={{ padding: "24px 0" }} />
      ) : (
        <Flex vertical>
          {items.map((run, i) => (
            <Flex
              key={run.id}
              align="center"
              justify="space-between"
              gap={8}
              style={{ padding: "8px 0", borderTop: i ? "1px solid var(--ant-color-split)" : undefined }}
            >
              <Flex align="center" gap={8} style={{ minWidth: 0 }}>
                <Tag style={{ margin: 0 }}>
                  {t(`enums.${JOB_FLOW_TYPES.includes(run.type as never) ? "JobFlowType" : "JobType"}.${run.type}`)}
                </Tag>
                <Typography.Text ellipsis style={{ maxWidth: 220 }}>
                  {run.name}
                </Typography.Text>
                <RunStatusTag status={run.status} />
              </Flex>
              <Typography.Text type="secondary" style={{ fontSize: 12, flexShrink: 0 }}>
                {status === "RUNNING" ? t("dashboard.running") : formatDuration(run.duration)}
              </Typography.Text>
            </Flex>
          ))}
        </Flex>
      )}
    </Card>
  );
}
