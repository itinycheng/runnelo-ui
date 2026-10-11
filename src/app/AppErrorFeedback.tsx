import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { App, Button, Descriptions, Drawer, Flex, Space, Typography, type NotificationArgsProps } from "antd";
import { CopyOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { subscribeToAppErrors, type AppErrorNotice } from "./errorFeedback";

type NormalizedNotice = Required<Pick<AppErrorNotice, "occurredAt">> & AppErrorNotice;

const NOTIFICATION_CONTENT_OFFSET = 28;
const notificationActionStyle: CSSProperties = { height: "auto", padding: 0 };
const notificationTimestampStyle: CSSProperties = { flex: "none", fontSize: 12, fontWeight: 400 };
const notificationStyles: NotificationArgsProps["styles"] = {
  root: {
    width: "min(360px, calc(100vw - 24px))",
    padding: "14px 14px 12px 12px",
    borderInlineStart: "3px solid var(--ant-color-error)",
    borderRadius: 8,
  },
  title: {
    marginBottom: 4,
    marginInlineStart: NOTIFICATION_CONTENT_OFFSET,
    paddingInlineEnd: 32,
  },
  description: {
    color: "var(--ant-color-text-secondary)",
    lineHeight: 1.5,
    marginInlineStart: NOTIFICATION_CONTENT_OFFSET,
  },
  actions: {
    display: "flex",
    float: "none",
    justifyContent: "flex-start",
    width: "auto",
    marginTop: 8,
    marginInlineStart: NOTIFICATION_CONTENT_OFFSET,
  },
  icon: { fontSize: 16, marginTop: 2 },
};

function requestPath(url?: string): string | undefined {
  if (!url) return undefined;
  try {
    return new URL(url, window.location.origin).pathname;
  } catch {
    return url.split("?")[0];
  }
}

function copyText(notice: NormalizedNotice, labels: Record<string, string>): string {
  const path = requestPath(notice.url);
  return [
    `${labels.title}: ${notice.title}`,
    `${labels.description}: ${notice.description}`,
    notice.status != null ? `${labels.status}: ${notice.status}` : undefined,
    notice.code != null ? `${labels.code}: ${notice.code}` : undefined,
    notice.method ? `${labels.method}: ${notice.method.toUpperCase()}` : undefined,
    path ? `${labels.path}: ${path}` : undefined,
    notice.requestId ? `${labels.requestId}: ${notice.requestId}` : undefined,
    notice.traceId ? `${labels.traceId}: ${notice.traceId}` : undefined,
    `${labels.time}: ${new Date(notice.occurredAt).toLocaleString()}`,
  ]
    .filter(Boolean)
    .join("\n");
}

function relativeTime(occurredAt: string, now: number, t: TFunction): string {
  const elapsedSeconds = Math.max(0, Math.floor((now - new Date(occurredAt).getTime()) / 1_000));
  if (elapsedSeconds < 10) return t("errorFeedback.justNow");
  if (elapsedSeconds < 60) return t("errorFeedback.secondsAgo", { count: elapsedSeconds });
  if (elapsedSeconds < 3_600) return t("errorFeedback.minutesAgo", { count: Math.floor(elapsedSeconds / 60) });
  if (elapsedSeconds < 86_400) return t("errorFeedback.hoursAgo", { count: Math.floor(elapsedSeconds / 3_600) });
  return t("errorFeedback.daysAgo", { count: Math.floor(elapsedSeconds / 86_400) });
}

function RelativeTimestamp({ notice, t }: { notice: NormalizedNotice; t: TFunction }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, []);
  return (
    <Typography.Text type="secondary" style={notificationTimestampStyle}>
      {relativeTime(notice.occurredAt, now, t)}
    </Typography.Text>
  );
}

function useErrorNotifications(onDetails: (notice: NormalizedNotice) => void) {
  const { notification } = App.useApp();
  const { t } = useTranslation();
  useEffect(
    () =>
      subscribeToAppErrors((notice) => {
        const actions = (
          <Flex align="center" justify="space-between" gap={12} style={{ width: "100%" }}>
            <Space size={12}>
              {notice.retry && (
                <Button
                  type="link"
                  size="small"
                  style={notificationActionStyle}
                  onClick={() => {
                    notification.destroy(notice.key);
                    void notice.retry?.();
                  }}
                >
                  {t("common.retry")}
                </Button>
              )}
              <Button
                type="link"
                size="small"
                style={notificationActionStyle}
                onClick={() => {
                  notification.destroy(notice.key);
                  onDetails(notice);
                }}
              >
                {t("errorFeedback.viewDetails")}
              </Button>
            </Space>
            <RelativeTimestamp notice={notice} t={t} />
          </Flex>
        );
        notification.error({
          key: notice.key,
          title: notice.title,
          description: notice.description,
          actions,
          styles: notificationStyles,
          duration: notice.persistent ? false : 8,
          showProgress: !notice.persistent,
          pauseOnHover: true,
          role: "alert",
          props: { "data-testid": "app-error-notification" },
        });
      }),
    [notification, onDetails, t],
  );
}

/** Mount once inside Ant Design's App provider to render global error feedback. */
export function AppErrorFeedbackHost() {
  const { message } = App.useApp();
  const { t } = useTranslation();
  const [details, setDetails] = useState<NormalizedNotice | null>(null);
  useErrorNotifications(setDetails);

  const detailLabels = useMemo(
    () => ({
      title: t("errorFeedback.errorTitle"),
      description: t("common.description"),
      status: t("errorFeedback.httpStatus"),
      code: t("errorFeedback.businessCode"),
      method: t("errorFeedback.requestMethod"),
      path: t("errorFeedback.requestPath"),
      requestId: t("errorFeedback.requestId"),
      traceId: t("errorFeedback.traceId"),
      time: t("errorFeedback.occurredAt"),
    }),
    [t],
  );
  const detailsPath = requestPath(details?.url);

  const handleCopy = async () => {
    if (!details) return;
    try {
      await navigator.clipboard.writeText(copyText(details, detailLabels));
      void message.success(t("errorFeedback.copied"));
    } catch {
      void message.error(t("errorFeedback.copyFailed"));
    }
  };

  return (
    <Drawer
      title={t("errorFeedback.detailsTitle")}
      open={details != null}
      onClose={() => setDetails(null)}
      size={440}
      extra={
        <Button icon={<CopyOutlined />} onClick={() => void handleCopy()}>
          {t("errorFeedback.copyDetails")}
        </Button>
      }
      destroyOnHidden
    >
      {details && (
        <Descriptions bordered size="small" column={1} styles={{ label: { width: 124 } }}>
          <Descriptions.Item label={detailLabels.title}>{details.title}</Descriptions.Item>
          <Descriptions.Item label={detailLabels.description}>{details.description}</Descriptions.Item>
          {details.status != null && (
            <Descriptions.Item label={detailLabels.status}>{details.status}</Descriptions.Item>
          )}
          {details.code != null && (
            <Descriptions.Item label={detailLabels.code}>{details.code}</Descriptions.Item>
          )}
          {details.method && (
            <Descriptions.Item label={detailLabels.method}>
              {details.method.toUpperCase()}
            </Descriptions.Item>
          )}
          {detailsPath && (
            <Descriptions.Item label={detailLabels.path}>
              <Typography.Text code>{detailsPath}</Typography.Text>
            </Descriptions.Item>
          )}
          {details.requestId && (
            <Descriptions.Item label={detailLabels.requestId}>
              <Typography.Text copyable>{details.requestId}</Typography.Text>
            </Descriptions.Item>
          )}
          {details.traceId && (
            <Descriptions.Item label={detailLabels.traceId}>
              <Typography.Text copyable>{details.traceId}</Typography.Text>
            </Descriptions.Item>
          )}
          <Descriptions.Item label={detailLabels.time}>
            {new Date(details.occurredAt).toLocaleString()}
          </Descriptions.Item>
        </Descriptions>
      )}
    </Drawer>
  );
}
