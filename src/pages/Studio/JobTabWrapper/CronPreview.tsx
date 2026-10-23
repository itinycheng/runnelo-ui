import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, List, Spin, Typography } from "antd";
import { useQuery } from "@tanstack/react-query";
import { previewCron } from "@/api/jobFlow";
import { queryKeys } from "@/api/queryKeys";
import { queryClient } from "@/app/queryClient";
import { useWorkspaceStore } from "@/stores/workspaceStore";

interface CronPreviewProps {
  expression: string;
}

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

/** Shows validity and the next few execution times for a cron expression. */
export default function CronPreview({ expression }: CronPreviewProps) {
  const { t } = useTranslation();
  const workspaceId = useWorkspaceStore((state) => state.currentId);
  const cron = useDebouncedValue(expression.trim(), 350);
  const looksLikeQuartz = cron.split(/\s+/).length >= 6;
  const {
    data: runs = [],
    isFetching,
    isError,
  } = useQuery(
    {
      queryKey: queryKeys.definitions.cronPreview(workspaceId, cron),
      queryFn: () => previewCron(cron),
      enabled: workspaceId != null && looksLikeQuartz,
      staleTime: 60_000,
    },
    queryClient,
  );

  if (!expression?.trim()) return null;

  if (!looksLikeQuartz || isError) {
    return <Alert type="error" showIcon message={t("sidePanel.cronInvalid")} style={{ marginBottom: 8 }} />;
  }

  if (isFetching) return <Spin size="small" />;

  return (
    <List
      size="small"
      header={<Typography.Text type="secondary">{t("sidePanel.nextRuns")}</Typography.Text>}
      dataSource={runs}
      renderItem={(time) => (
        <List.Item style={{ padding: "2px 0" }}>
          <Typography.Text className="app-meta-text">{time}</Typography.Text>
        </List.Item>
      )}
    />
  );
}
