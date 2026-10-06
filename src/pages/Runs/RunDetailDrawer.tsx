import { useState } from "react";
import {
  Descriptions,
  Drawer,
  Empty,
  Flex,
  Modal,
  Spin,
  Table,
  Tabs,
  Tag,
  Typography,
  type TableColumnsType,
} from "antd";
import { useTranslation } from "react-i18next";
import { getFlowRunDetail, getJobRunLog } from "@/api/run";
import type { FlowRunDetail, JobRun } from "@/types/run";
import { RunStatusTag } from "./RunStatusTag";
import { formatDuration, isFlowType } from "./runStatus";
import { RunFlowGraph } from "./RunFlowGraph";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/api/queryKeys";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { execIsRunning } from "./runStatus";
import { enumColor } from "@/utils/statusColor";

const preStyle: React.CSSProperties = {
  whiteSpace: "pre-wrap",
  wordBreak: "break-all",
  background: "var(--ant-color-fill-quaternary)",
  padding: 12,
  borderRadius: "var(--ant-border-radius)",
  fontSize: 12,
  margin: 0,
  maxHeight: 360,
  overflow: "auto",
};

function LogView({ jobRunId }: { jobRunId: string }) {
  const { t } = useTranslation();
  const workspaceId = useWorkspaceStore((state) => state.currentId);
  const {
    data,
    isPending: loading,
    isError,
  } = useQuery({
    queryKey: queryKeys.runs.log(workspaceId, jobRunId),
    queryFn: () => getJobRunLog(jobRunId),
    enabled: workspaceId != null,
    refetchInterval: 5_000,
  });
  if (loading) return <Spin />;
  return <pre style={preStyle}>{isError ? t("runs.logLoadFailed") : data?.content}</pre>;
}

function RunMeta({ run }: { run: FlowRunDetail }) {
  const { t } = useTranslation();
  const typeGroup = isFlowType(run.type) ? "JobFlowType" : "JobType";
  return (
    <>
      <Flex align="center" gap={8} style={{ marginBottom: 12 }}>
        <Tag color={enumColor(run.type)}>{t(`enums.${typeGroup}.${run.type}`)}</Tag>
        <Typography.Text strong>{run.name}</Typography.Text>
        <RunStatusTag status={run.status} />
      </Flex>
      <Descriptions size="small" column={2} style={{ marginBottom: 16 }}>
        <Descriptions.Item label={t("runs.owner")}>{run.submitter}</Descriptions.Item>
        <Descriptions.Item label={t("runs.duration")}>{formatDuration(run.duration)}</Descriptions.Item>
        <Descriptions.Item label={t("runs.startTime")}>{new Date(run.startTime).toLocaleString()}</Descriptions.Item>
        <Descriptions.Item label={t("runs.endTime")}>
          {run.endTime ? new Date(run.endTime).toLocaleString() : "-"}
        </Descriptions.Item>
      </Descriptions>
    </>
  );
}

function FlowDetail({ run }: { run: FlowRunDetail }) {
  const { t } = useTranslation();
  const [node, setNode] = useState<JobRun | null>(null);
  const byId = (id: string) => run.nodes?.find((n) => n.id === id) ?? null;

  const columns: TableColumnsType<JobRun> = [
    { title: t("common.name"), dataIndex: "name", ellipsis: true },
    {
      title: t("common.type"),
      dataIndex: "type",
      width: 90,
      render: (v: string) => <Tag color={enumColor(v)}>{t(`enums.JobType.${v}`)}</Tag>,
    },
    {
      title: t("common.status"),
      dataIndex: "status",
      width: 100,
      render: (_, r) => <RunStatusTag status={r.status} />,
    },
    { title: t("runs.duration"), dataIndex: "duration", width: 100, render: (_, r) => formatDuration(r.duration) },
    { title: "", width: 60, render: (_, r) => <a onClick={() => setNode(r)}>{t("runs.viewLog")}</a> },
  ];

  return (
    <Flex vertical gap={16}>
      {run.graph && <RunFlowGraph graph={run.graph} onNodeClick={(id) => setNode(byId(id))} />}
      <Table<JobRun> size="small" rowKey="id" columns={columns} dataSource={run.nodes ?? []} pagination={false} />
      <Modal title={node?.name} open={!!node} footer={null} width={720} onCancel={() => setNode(null)}>
        {node && (
          <Tabs
            items={[
              { key: "log", label: t("runs.viewLog"), children: <LogView jobRunId={node.id} /> },
              {
                key: "params",
                label: t("runs.params"),
                children: <pre style={preStyle}>{node.params}</pre>,
              },
            ]}
          />
        )}
      </Modal>
    </Flex>
  );
}

function AtomicDetail({ run }: { run: FlowRunDetail }) {
  const { t } = useTranslation();
  const node = run.nodes[0];
  if (!node) return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t("runs.noNodeData")} />;
  return (
    <Tabs
      items={[
        { key: "log", label: t("runs.viewLog"), children: <LogView jobRunId={node.id} /> },
        { key: "params", label: t("runs.params"), children: <pre style={preStyle}>{node.params ?? "-"}</pre> },
      ]}
    />
  );
}

interface RunDetailDrawerProps {
  runId: string | null;
  open: boolean;
  onClose: () => void;
}

export default function RunDetailDrawer({ runId, open, onClose }: RunDetailDrawerProps) {
  const { t } = useTranslation();
  const workspaceId = useWorkspaceStore((state) => state.currentId);
  const { data: detail, isPending: loading } = useQuery({
    queryKey: queryKeys.runs.detail(workspaceId, runId),
    queryFn: () => getFlowRunDetail(runId!),
    enabled: open && !!runId && workspaceId != null,
    refetchInterval: (query) => (query.state.data && execIsRunning(query.state.data.status) ? 3_000 : false),
  });

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={t("runs.detail")}
      destroyOnHidden
      data-testid="run-detail"
      styles={{ wrapper: { width: "min(1120px, 92vw)" } }}
    >
      {loading || !detail ? (
        <Flex justify="center" style={{ paddingTop: 80 }}>
          <Spin />
        </Flex>
      ) : (
        <>
          <RunMeta run={detail} />
          {isFlowType(detail.type) ? <FlowDetail run={detail} /> : <AtomicDetail run={detail} />}
        </>
      )}
    </Drawer>
  );
}
