import { Button, Flex, Typography } from "antd";
import { CloseCircleOutlined } from "@ant-design/icons";

interface PageLoadErrorProps {
  title: string;
  description: string;
  retryLabel: string;
  onRetry: () => void;
}

/** Persistent, contextual error state for a page or data region that failed to load. */
export default function PageLoadError({ title, description, retryLabel, onRetry }: PageLoadErrorProps) {
  return (
    <Flex
      vertical
      align="center"
      justify="center"
      gap={8}
      role="alert"
      data-testid="page-load-error"
      style={{ minHeight: 220, padding: 24, textAlign: "center" }}
    >
      <CloseCircleOutlined style={{ color: "var(--ant-color-error)", fontSize: 28 }} />
      <Typography.Text strong>{title}</Typography.Text>
      <Typography.Text type="secondary">{description}</Typography.Text>
      <Button size="small" onClick={onRetry}>
        {retryLabel}
      </Button>
    </Flex>
  );
}
