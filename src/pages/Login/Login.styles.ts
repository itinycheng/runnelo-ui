import type { CSSProperties } from "react";

export type VisualTone = "current" | "success" | "failed" | "killed" | "running" | "waiting";

const color = {
  line: "color-mix(in srgb, var(--ant-color-text-tertiary) 36%, transparent)",
  node: "color-mix(in srgb, var(--ant-color-text-tertiary) 44%, transparent)",
  activeLine: "color-mix(in srgb, var(--ant-color-primary) 72%, transparent)",
  expandedFill: "color-mix(in srgb, var(--ant-color-bg-elevated) 94%, var(--ant-color-primary))",
  expandedStroke: "color-mix(in srgb, var(--ant-color-primary) 50%, transparent)",
} as const;

export const loginPageStyle: CSSProperties = {
  position: "relative",
  minHeight: "100vh",
  overflow: "hidden",
  background: "var(--ant-color-bg-layout)",
};

export const loginCardStyle: CSSProperties = {
  zIndex: 1,
  width: 400,
  maxWidth: "calc(100vw - 32px)",
};

export const backgroundStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  overflow: "hidden",
  pointerEvents: "none",
};

export function topologyStyle(mobile: boolean): CSSProperties {
  return { width: "100%", height: "100%", opacity: mobile ? 0.46 : 0.68 };
}

export const edgeStyle: CSSProperties = {
  fill: "none",
  stroke: color.line,
  strokeWidth: 1.25,
};

export const activeEdgeStyle: CSSProperties = {
  ...edgeStyle,
  stroke: color.activeLine,
  strokeWidth: 1.6,
  strokeDasharray: "5 8",
};

export const taskRectStyle: CSSProperties = {
  fill: "var(--ant-color-bg-elevated)",
  stroke: color.node,
  strokeWidth: 1,
};

export const expandedTaskStyle: CSSProperties = {
  ...taskRectStyle,
  fill: color.expandedFill,
  stroke: color.expandedStroke,
};

const toneColor: Record<VisualTone, string> = {
  current: "var(--ant-color-primary)",
  running: "var(--ant-color-primary)",
  success: "var(--ant-color-success)",
  failed: "var(--ant-color-error)",
  killed: "var(--ant-color-warning)",
  waiting: "var(--ant-color-text-tertiary)",
};

export function stateRectStyle(tone?: VisualTone): CSSProperties {
  return {
    ...taskRectStyle,
    ...(tone === "current" ? { fill: "var(--ant-color-primary-bg)" } : {}),
    ...(tone ? { stroke: toneColor[tone] } : {}),
  };
}

export function dotStyle(tone: VisualTone): CSSProperties {
  return { fill: toneColor[tone] };
}

export const textStyle: CSSProperties = {
  fill: "var(--ant-color-text-secondary)",
  fontFamily: "var(--ant-font-family-code)",
  fontSize: 11,
};

export const taskLabelStyle: CSSProperties = {
  ...textStyle,
  fill: "var(--ant-color-text)",
  fontWeight: 500,
};

export const smallTextStyle: CSSProperties = { ...textStyle, fontSize: 10 };
export const titleStyle: CSSProperties = { ...taskLabelStyle, fontSize: 11 };
export const captionStyle: CSSProperties = {
  ...textStyle,
  fill: "var(--ant-color-text-tertiary)",
  fontSize: 10,
};
