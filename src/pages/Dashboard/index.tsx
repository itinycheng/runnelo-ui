import { useState, type ReactNode } from "react";

import { Card, Col, Empty, Flex, Row, Segmented, Statistic, Typography } from "antd";
import { AppstoreOutlined, CheckCircleOutlined, CloseCircleOutlined, SyncOutlined } from "@ant-design/icons";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { getStats, getTrend, type DashboardStats, type TrendDataPoint } from "@/api/dashboard";
import { StatusDonut, RunListCard } from "./panels";
import { useQuery } from "@tanstack/react-query";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { queryKeys } from "@/api/queryKeys";
import { STATUS_TOKEN_COLOR } from "@/utils/statusColor";

const TREND_SERIES = [
  { key: "success", color: STATUS_TOKEN_COLOR.success },
  { key: "failed", color: STATUS_TOKEN_COLOR.error },
  { key: "running", color: STATUS_TOKEN_COLOR.warning },
] as const;

type TimeRange = "7d" | "14d" | "30d";

interface StatCardProps {
  title: string;
  scope: string;
  value: number | string;
  icon: ReactNode;
  iconColor: string;
  onClick: () => void;
}

function StatCard({ title, scope, value, icon, iconColor, onClick }: StatCardProps) {
  return (
    <Col xs={24} sm={12} lg={6}>
      <Card
        hoverable
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onClick()}
        style={{ height: "100%", cursor: "pointer" }}
        styles={{ body: { position: "relative", height: "100%" } }}
      >
        <Statistic
          title={
            <Flex align="baseline" gap={8}>
              <span>{title}</span>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {scope}
              </Typography.Text>
            </Flex>
          }
          value={value}
        />
        <span style={{ position: "absolute", top: 16, right: 16, fontSize: 24, color: iconColor }}>{icon}</span>
      </Card>
    </Col>
  );
}

function TrendChart({ trend }: { trend: TrendDataPoint[] }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  // Drill-down: clicking a series jumps to Job Runs filtered by that status.
  const drill = (status: string) => {
    void navigate(`/runs?status=${status}`);
  };
  return trend.length === 0 ? (
    <Flex align="center" justify="center" style={{ height: 240 }}>
      <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t("dashboard.trendUnavailable")} />
    </Flex>
  ) : (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={trend} margin={{ top: 8, right: 12, bottom: 0, left: -16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--ant-color-border-secondary)" vertical={false} />
        <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="var(--ant-color-text-tertiary)" />
        <YAxis tick={{ fontSize: 12 }} stroke="var(--ant-color-text-tertiary)" allowDecimals={false} width={44} />
        <Tooltip />
        <Legend onClick={(e) => drill(String(e.dataKey))} wrapperStyle={{ cursor: "pointer" }} />
        {TREND_SERIES.map((s) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={t(`dashboard.${s.key}`)}
            stroke={s.color}
            strokeWidth={2}
            dot={{ r: 3, cursor: "pointer" }}
            activeDot={{ r: 5, cursor: "pointer", onClick: () => drill(s.key) }}
            onClick={() => drill(s.key)}
            style={{ cursor: "pointer" }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

interface TaskTrendCardProps {
  trend: TrendDataPoint[];
  timeRange: TimeRange;
  onTimeRangeChange: (next: TimeRange) => void;
}

function TaskTrendCard({ trend, timeRange, onTimeRangeChange }: TaskTrendCardProps) {
  const { t } = useTranslation();
  const timeRanges = [
    { label: t("dashboard.last7Days"), value: "7d" },
    { label: t("dashboard.last14Days"), value: "14d" },
    { label: t("dashboard.last30Days"), value: "30d" },
  ];

  return (
    <Col xs={24} lg={16}>
      <Card style={{ height: "100%" }}>
        <Flex justify="space-between" align="center" style={{ marginBottom: 16 }}>
          <Typography.Text strong style={{ fontSize: 15 }}>
            {t("dashboard.taskTrend")}
          </Typography.Text>
          <Segmented
            options={timeRanges}
            value={timeRange}
            onChange={(v) => onTimeRangeChange(v as TimeRange)}
            size="small"
          />
        </Flex>
        <TrendChart trend={trend} />
      </Card>
    </Col>
  );
}

export default function Dashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = useState<TimeRange>("7d");
  const workspaceId = useWorkspaceStore((state) => state.currentId);
  const { data: stats = null } = useQuery<DashboardStats>({
    queryKey: queryKeys.dashboard(workspaceId),
    queryFn: getStats,
    enabled: workspaceId != null,
    refetchInterval: 30_000,
  });
  const { data: trend = [] } = useQuery<TrendDataPoint[]>({
    queryKey: [...queryKeys.dashboard(workspaceId), "trend", timeRange],
    queryFn: () => getTrend(timeRange),
    enabled: workspaceId != null,
  });

  const toRuns = (status?: string) => () => void navigate(status ? `/runs?status=${status}` : "/runs");

  return (
    <div>
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <StatCard
          title={t("dashboard.totalRuns")}
          scope={t("dashboard.last24h")}
          value={stats?.totalTasks ?? "-"}
          icon={<AppstoreOutlined />}
          iconColor="var(--ant-color-primary)"
          onClick={toRuns()}
        />
        <StatCard
          title={t("dashboard.successTasks")}
          scope={t("dashboard.last24h")}
          value={stats?.successTasks ?? "-"}
          icon={<CheckCircleOutlined />}
          iconColor={STATUS_TOKEN_COLOR.success}
          onClick={toRuns("SUCCESS")}
        />
        <StatCard
          title={t("dashboard.failedTasks")}
          scope={t("dashboard.last24h")}
          value={stats?.failedTasks ?? "-"}
          icon={<CloseCircleOutlined />}
          iconColor={STATUS_TOKEN_COLOR.error}
          onClick={toRuns("FAILURE")}
        />
        <StatCard
          title={t("dashboard.runningTasks")}
          scope={t("dashboard.now")}
          value={stats?.runningTasks ?? "-"}
          icon={<SyncOutlined />}
          iconColor={STATUS_TOKEN_COLOR.warning}
          onClick={toRuns("RUNNING")}
        />
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={8}>
          <StatusDonut stats={stats} />
        </Col>
        <TaskTrendCard trend={trend} timeRange={timeRange} onTimeRangeChange={setTimeRange} />

        <Col xs={24} lg={12}>
          <RunListCard status="FAILURE" title={t("dashboard.recentFailed")} emptyText={t("dashboard.noFailures")} />
        </Col>
        <Col xs={24} lg={12}>
          <RunListCard status="RUNNING" title={t("dashboard.runningNow")} emptyText={t("dashboard.nothingRunning")} />
        </Col>
      </Row>
    </div>
  );
}
