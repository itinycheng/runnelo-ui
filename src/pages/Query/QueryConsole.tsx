import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, Card, Drawer, Dropdown, Flex, Grid, Layout, Space, Tag, Tooltip, Typography } from "antd";
import type { MenuProps } from "antd";
import {
  CheckCircleFilled,
  CodeOutlined,
  CloseCircleFilled,
  ClearOutlined,
  DownloadOutlined,
  FormatPainterOutlined,
  HistoryOutlined,
  MenuOutlined,
  MenuUnfoldOutlined,
  PlayCircleOutlined,
} from "@ant-design/icons";
import CodeEditor from "@/components/CodeEditor";
import { PAGE_PADDING, SECTION_GAP } from "@/constants/layout";
import type { QueryResult } from "@/types/query";
import ResultPanel from "./ResultPanel";
import SchemaSidebar from "./SchemaSidebar";
import { useQueryConsole } from "./useQueryConsole";
import type { QueryHistoryEntry } from "./useQueryHistory";
import { enumColor } from "@/utils/statusColor";

function formatTime(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function QueryConsole() {
  const { t } = useTranslation();
  const consoleState = useQueryConsole();
  const compact = Grid.useBreakpoint().lg === false;
  const [schemaOpen, setSchemaOpen] = useState(false);
  const [schemaCollapsed, setSchemaCollapsed] = useState(false);
  const schema = (
    <SchemaSidebar
      datasourceId={consoleState.datasourceId}
      datasources={consoleState.options}
      onDatasourceChange={consoleState.setDatasourceId}
      onInsert={consoleState.insertToken}
      showHeader={!compact}
      onCollapse={compact ? undefined : () => setSchemaCollapsed(true)}
    />
  );

  if (compact) {
    return (
      <div style={{ position: "relative", height: "100%" }} data-testid="query-console">
        <QueryWorkspace consoleState={consoleState} onOpenSchema={() => setSchemaOpen(true)} />
        <Drawer
          title={t("query.schema")}
          placement="left"
          width={280}
          open={schemaOpen}
          onClose={() => setSchemaOpen(false)}
          getContainer={false}
          rootStyle={{ position: "absolute" }}
          styles={{ body: { padding: 0 } }}
        >
          {schema}
        </Drawer>
      </div>
    );
  }

  return (
    <Flex style={{ height: "100%", background: "var(--ant-color-bg-layout)" }} data-testid="query-console">
      <Layout.Sider
        theme="light"
        width={264}
        collapsedWidth={44}
        collapsed={schemaCollapsed}
        collapsible
        trigger={null}
        style={{ borderRight: "1px solid var(--ant-color-split)", overflow: "hidden" }}
      >
        {schemaCollapsed ? (
          <Tooltip title={t("query.showSchema")} placement="right">
            <Button
              type="text"
              shape="circle"
              icon={<MenuUnfoldOutlined />}
              aria-label={t("query.showSchema")}
              onClick={() => setSchemaCollapsed(false)}
              style={{ margin: 8 }}
            />
          </Tooltip>
        ) : (
          schema
        )}
      </Layout.Sider>
      <div style={{ flex: 1, minWidth: 0 }}>
        <QueryWorkspace consoleState={consoleState} />
      </div>
    </Flex>
  );
}

function QueryWorkspace({
  consoleState,
  onOpenSchema,
}: {
  consoleState: ReturnType<typeof useQueryConsole>;
  onOpenSchema?: () => void;
}) {
  const { t } = useTranslation();
  const { editorRef, sql, setSql, running, result, history, run, formatSql, clear, pickHistory, exportCsv } =
    consoleState;

  const canExport = !!result?.success && result.rows.length > 0;

  return (
    <Flex vertical style={{ height: "100%", minWidth: 0, padding: PAGE_PADDING, overflow: "auto" }}>
      <Card size="small" style={{ marginBottom: SECTION_GAP }}>
        <Toolbar
          onOpenSchema={onOpenSchema}
          running={running}
          onRun={run}
          onFormat={formatSql}
          onClear={clear}
          history={history.entries}
          onPickHistory={pickHistory}
          onClearHistory={history.clear}
        />
        <CodeEditor
          ref={editorRef}
          value={sql}
          onChange={setSql}
          language="sql"
          placeholder={t("query.sqlPlaceholder")}
          onRun={run}
        />
      </Card>
      <Card size="small">
        <Flex justify="space-between" align="center" style={{ marginBottom: 8, minHeight: 24 }}>
          <ResultMeta result={result} />
          <Button
            size="small"
            icon={<DownloadOutlined />}
            disabled={!canExport}
            onClick={exportCsv}
            data-testid="export-csv-button"
          >
            {t("query.exportCsv")}
          </Button>
        </Flex>
        <ResultPanel result={result} />
      </Card>
    </Flex>
  );
}

interface ToolbarProps {
  onOpenSchema?: () => void;
  running: boolean;
  onRun: () => void;
  onFormat: () => void;
  onClear: () => void;
  history: QueryHistoryEntry[];
  onPickHistory: (entry: QueryHistoryEntry) => void;
  onClearHistory: () => void;
}

function Toolbar(props: ToolbarProps) {
  const { t } = useTranslation();
  const { onOpenSchema, running, onRun, onFormat, onClear } = props;

  const historyItems: MenuProps["items"] = props.history.length
    ? [
        ...props.history.map((entry, i) => ({
          key: String(i),
          label: (
            <Flex vertical style={{ maxWidth: 360 }} onClick={() => props.onPickHistory(entry)}>
              <Typography.Text ellipsis style={{ fontFamily: "monospace", fontSize: 12 }}>
                {entry.sql.replace(/\s+/g, " ")}
              </Typography.Text>
              <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                {formatTime(entry.ts)}
              </Typography.Text>
            </Flex>
          ),
        })),
        { type: "divider" as const },
        { key: "clear-history", label: t("query.clearHistory"), onClick: props.onClearHistory },
      ]
    : [{ key: "empty", label: t("query.historyEmpty"), disabled: true }];

  return (
    <Flex justify="space-between" align="center" wrap gap={8} style={{ marginBottom: 12 }}>
      <Space size={8}>
        {onOpenSchema && (
          <Button
            type="text"
            shape="circle"
            icon={<MenuOutlined />}
            aria-label={t("query.schema")}
            onClick={onOpenSchema}
          />
        )}
        <CodeOutlined style={{ color: "var(--ant-color-text-tertiary)" }} />
        <Typography.Text strong>{t("query.console")}</Typography.Text>
        <Tag color={enumColor("SQL")} style={{ margin: 0 }}>
          SQL
        </Tag>
      </Space>
      <Space wrap size={6}>
        <Dropdown menu={{ items: historyItems }} trigger={["click"]} placement="bottomRight">
          <Button icon={<HistoryOutlined />} data-testid="history-button">
            {t("query.history")}
          </Button>
        </Dropdown>
        <Button icon={<ClearOutlined />} onClick={onClear}>
          {t("query.clear")}
        </Button>
        <Button icon={<FormatPainterOutlined />} onClick={onFormat}>
          {t("query.formatSql")}
        </Button>
        <Tooltip title={t("query.runTooltip")}>
          <Button
            type="primary"
            icon={<PlayCircleOutlined />}
            loading={running}
            onClick={onRun}
            data-testid="run-query-button"
          >
            {t("query.run")}
          </Button>
        </Tooltip>
      </Space>
    </Flex>
  );
}

/** One-line status summary shown above the result table. */
function ResultMeta({ result }: { result: QueryResult | null }) {
  const { t } = useTranslation();
  if (!result) return <span />;
  if (!result.success) {
    return (
      <Space size={6}>
        <CloseCircleFilled style={{ color: "var(--ant-color-error)" }} />
        <Typography.Text type="danger">{t("query.queryFailedSeeLog")}</Typography.Text>
      </Space>
    );
  }
  return (
    <Space size={6}>
      <CheckCircleFilled style={{ color: "var(--ant-color-success)" }} />
      <Typography.Text type="secondary">
        {t("query.rowsMeta", { rows: result.rows.length, ms: result.elapsedMs })}
      </Typography.Text>
    </Space>
  );
}
