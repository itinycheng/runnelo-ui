import { useMemo, useState } from "react";
import { Button, Descriptions, Drawer, Tag, Typography } from "antd";
import { CheckCircleOutlined, CloseCircleOutlined } from "@ant-design/icons";
import { ProTable, type ProColumns } from "@ant-design/pro-components";
import { useTranslation } from "react-i18next";
import type { AuditLog, AuditResult } from "@/types/admin";
import { getAuditLogs, type AuditLogQuery } from "@/api/admin";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/app/queryClient";
import { queryKeys } from "@/api/queryKeys";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { actionColor, statusColor } from "@/utils/statusColor";

const ACTIONS = ["CREATE", "UPDATE", "DELETE", "LOGIN", "LOGOUT", "RUN", "ONLINE", "OFFLINE"];
const MODULES = ["user", "resource", "workflow", "task", "datasource", "config", "tag"];

type TFunc = (key: string, opts?: Record<string, unknown>) => string;

// Raw backend enums (ALLCAPS actions, lowercase modules) → localized labels; the raw
// value stays the filter/query value and tag-color key, only the display text is translated.
const actionLabel = (t: TFunc, action: string) => t(`audit.actions.${action}`, { defaultValue: action });
const moduleLabel = (t: TFunc, module: string) => t(`audit.modules.${module}`, { defaultValue: module });

const toValueEnum = (values: string[], label: (v: string) => string) =>
  Object.fromEntries(values.map((v) => [v, { text: label(v) }]));

function AuditActionTag({ action }: { action: string }) {
  const { t } = useTranslation();
  return <Tag color={actionColor(action)}>{actionLabel(t, action)}</Tag>;
}

function AuditResultTag({ result }: { result: AuditResult }) {
  const { t } = useTranslation();
  return result === "success" ? (
    <Tag icon={<CheckCircleOutlined />} color={statusColor(result)}>
      {t("audit.resultSuccess")}
    </Tag>
  ) : (
    <Tag icon={<CloseCircleOutlined />} color={statusColor(result)}>
      {t("audit.resultFailed")}
    </Tag>
  );
}

/** Pretty-print a JSON detail string; fall back to the raw text if not JSON. */
function formatDetail(detail: string): string {
  try {
    return JSON.stringify(JSON.parse(detail), null, 2);
  } catch {
    return detail;
  }
}

function AuditDetailDrawer({ record, onClose }: { record: AuditLog | null; onClose: () => void }) {
  const { t } = useTranslation();
  return (
    <Drawer title={t("audit.detailTitle")} width={520} open={!!record} onClose={onClose} destroyOnHidden>
      {record && (
        <Descriptions column={1} bordered size="small">
          <Descriptions.Item label={t("audit.time")}>{new Date(record.createdAt).toLocaleString()}</Descriptions.Item>
          <Descriptions.Item label={t("audit.operator")}>{record.operator}</Descriptions.Item>
          <Descriptions.Item label={t("audit.action")}>
            <AuditActionTag action={record.action} />
          </Descriptions.Item>
          <Descriptions.Item label={t("audit.module")}>{record.module}</Descriptions.Item>
          <Descriptions.Item label={t("audit.target")}>{record.target || "-"}</Descriptions.Item>
          <Descriptions.Item label={t("audit.result")}>
            <AuditResultTag result={record.result} />
          </Descriptions.Item>
          <Descriptions.Item label={t("audit.ip")}>{record.ip || "-"}</Descriptions.Item>
          <Descriptions.Item label={t("audit.detail")}>
            {record.detail ? (
              <Typography.Paragraph>
                <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                  {formatDetail(record.detail)}
                </pre>
              </Typography.Paragraph>
            ) : (
              <Typography.Text type="secondary">{t("audit.noDetail")}</Typography.Text>
            )}
          </Descriptions.Item>
        </Descriptions>
      )}
    </Drawer>
  );
}

function useAuditColumns(t: ReturnType<typeof useTranslation>["t"], setDetail: (record: AuditLog) => void) {
  return useMemo<ProColumns<AuditLog>[]>(
    () => [
      {
        title: t("audit.time"),
        dataIndex: "createdAt",
        key: "createdAt",
        width: 180,
        valueType: "dateTimeRange",
        render: (_, r) => new Date(r.createdAt).toLocaleString(),
        search: {
          transform: (value: [string, string]) => ({
            startTime: value?.[0] ? new Date(value[0]).toISOString() : undefined,
            endTime: value?.[1] ? new Date(value[1]).toISOString() : undefined,
          }),
        },
      },
      { title: t("audit.operator"), dataIndex: "operator", key: "operator", width: 140, ellipsis: true },
      {
        title: t("audit.action"),
        dataIndex: "action",
        key: "action",
        width: 120,
        valueType: "select",
        valueEnum: toValueEnum(ACTIONS, (v) => actionLabel(t, v)),
        render: (_, r) => <AuditActionTag action={r.action} />,
      },
      {
        title: t("audit.module"),
        dataIndex: "module",
        key: "module",
        width: 120,
        valueType: "select",
        valueEnum: toValueEnum(MODULES, (v) => moduleLabel(t, v)),
        render: (_, r) => moduleLabel(t, r.module),
      },
      { title: t("audit.target"), dataIndex: "target", key: "target", width: 140, ellipsis: true, hideInSearch: true },
      {
        title: t("audit.result"),
        dataIndex: "result",
        key: "result",
        width: 110,
        valueType: "select",
        valueEnum: { success: { text: t("audit.resultSuccess") }, failed: { text: t("audit.resultFailed") } },
        render: (_, r) => <AuditResultTag result={r.result} />,
      },
      { title: t("audit.ip"), dataIndex: "ip", key: "ip", width: 130, hideInSearch: true },
      {
        title: t("audit.detail"),
        key: "action-view",
        width: 90,
        hideInSearch: true,
        render: (_, record) => (
          <Button type="link" size="small" onClick={() => setDetail(record)}>
            {t("audit.view")}
          </Button>
        ),
      },
    ],
    [t, setDetail],
  );
}

function useAuditPage() {
  const workspaceId = useWorkspaceStore((state) => state.currentId);
  const [params, setParams] = useState<AuditLogQuery>({ page: 1, pageSize: 10 });
  const query = useQuery(
    {
      queryKey: queryKeys.adminList(workspaceId, "audit-logs", params),
      queryFn: () => getAuditLogs(params),
      enabled: workspaceId != null,
    },
    queryClient,
  );
  return { params, setParams, query };
}

export default function AuditLogList() {
  const { t } = useTranslation();
  const [detail, setDetail] = useState<AuditLog | null>(null);
  const columns = useAuditColumns(t, setDetail);
  const { params, setParams, query } = useAuditPage();

  return (
    <div data-testid="audit-log-list">
      <ProTable<AuditLog>
        headerTitle={t("audit.title")}
        rowKey="id"
        columns={columns}
        dataSource={query.data?.data ?? []}
        loading={query.isFetching}
        options={false}
        onSubmit={(values) => {
          setParams((current) => ({ ...current, ...values, page: 1 }));
        }}
        onReset={() => setParams({ page: 1, pageSize: params.pageSize })}
        pagination={{
          current: params.page,
          pageSize: params.pageSize,
          total: query.data?.total ?? 0,
          showSizeChanger: true,
          onChange: (page, pageSize) => setParams((current) => ({ ...current, page, pageSize })),
        }}
      />
      <AuditDetailDrawer record={detail} onClose={() => setDetail(null)} />
    </div>
  );
}
