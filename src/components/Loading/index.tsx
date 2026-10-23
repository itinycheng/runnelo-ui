import { Flex, Spin, type SpinProps } from "antd";

export interface LoadingProps {
  /** Whether the loading indicator is visible. */
  loading?: boolean;
  /** Custom tip text displayed below the spinner. */
  tip?: string;
  /** Size of the spinner. */
  size?: SpinProps["size"];
  /** Whether to render as a full-page centered overlay. */
  fullPage?: boolean;
  /** Content to wrap — when provided, Spin wraps children and shows overlay while loading. */
  children?: React.ReactNode;
}

/**
 * Loading — Unified loading indicator component.
 *
 * Wraps Ant Design's Spin component to provide a consistent loading experience
 * across the application.
 *
 * Usage:
 * - Standalone spinner: `<Loading loading />`
 * - Full-page spinner: `<Loading loading fullPage />`
 * - Wrap content: `<Loading loading={isLoading}><Table ... /></Loading>`
 *
 * Note: ProTable-based list pages use ProTable's built-in loading state.
 * This component is intended for custom loading scenarios outside of ProTable.
 *
 * Requirements: 9.1
 */
export default function Loading({ loading = true, tip, size = "large", fullPage = false, children }: LoadingProps) {
  if (children) {
    return (
      <div data-testid="loading-wrapper">
        <Spin spinning={loading} tip={tip} size={size}>
          {children}
        </Spin>
      </div>
    );
  }

  const spinner = <Spin spinning={loading} tip={tip} size={size} data-testid="loading-spinner" />;

  if (fullPage) {
    return (
      <Flex data-testid="loading-fullpage" justify="center" align="center" style={{ minHeight: "100vh" }}>
        {spinner}
      </Flex>
    );
  }

  return (
    <Flex data-testid="loading-container" justify="center" align="center">
      {spinner}
    </Flex>
  );
}
