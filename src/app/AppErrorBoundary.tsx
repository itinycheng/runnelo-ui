import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button, Result } from "antd";

interface Props {
  children: ReactNode;
}

interface State {
  failed: boolean;
}

/** Last-resort boundary so a rendering error does not leave a blank scheduler UI. */
export class AppErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[Runnelo UI] uncaught render error", error, info);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <Result
        status="500"
        title="页面加载失败"
        subTitle="请刷新页面后重试"
        extra={<Button onClick={() => window.location.reload()}>刷新</Button>}
      />
    );
  }
}
