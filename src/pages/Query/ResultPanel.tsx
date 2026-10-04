import { useTranslation } from "react-i18next";
import { Empty, Table, Tabs, Typography } from "antd";
import type { QueryResult } from "@/types/query";

interface ResultPanelProps {
  result: QueryResult | null;
}

/** Renders the query result as a data table and an execution log tab. */
export default function ResultPanel({ result }: ResultPanelProps) {
  const { t } = useTranslation();
  if (!result) {
    return <Empty description={t("query.emptyHint")} style={{ marginTop: 60 }} />;
  }

  const columns = result.columns.map((c) => ({ title: c, dataIndex: c, key: c, ellipsis: true }));
  const dataSource = result.rows.map((row, i) => ({ key: i, ...row }));

  return (
    <Tabs
      defaultActiveKey={result.success ? "result" : "log"}
      items={[
        {
          key: "result",
          label: t("query.resultCount", { count: result.rows.length }),
          children: result.success ? (
            <Table
              size="small"
              columns={columns}
              dataSource={dataSource}
              scroll={{ x: true }}
              pagination={{ pageSize: 10 }}
            />
          ) : (
            <Empty description={t("query.queryFailedSeeLog")} />
          ),
        },
        {
          key: "log",
          label: t("query.logTab"),
          children: (
            <Typography.Paragraph>
              <pre
                style={{
                  whiteSpace: "pre-wrap",
                  background: "var(--ant-color-fill-quaternary)",
                  padding: 12,
                  borderRadius: "var(--ant-border-radius)",
                  fontSize: 12,
                  color: result.success ? undefined : "var(--ant-color-error)",
                }}
              >
                {result.log}
              </pre>
            </Typography.Paragraph>
          ),
        },
      ]}
    />
  );
}
