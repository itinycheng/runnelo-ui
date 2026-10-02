/* eslint-disable react-refresh/only-export-components --
   Icon registry + helper are colocated with the component on purpose; this file
   is a leaf module, so losing Fast Refresh for it (full reload on edit) is fine. */
import flinkIcon from "@/assets/flink.svg";
import sqlIcon from "@/assets/sql.svg";
import shellIcon from "@/assets/command.svg";
import hiveIcon from "@/assets/hive.svg";
import flowIcon from "@/assets/flow.svg";
import dependIcon from "@/assets/depend.svg";
import joinIcon from "@/assets/join.svg";
import React from "react";

/**
 * Single source of truth for task/workflow icons: each type maps to its glyph
 * and a brand color. Every render site (tree, tabs, DAG nodes, palette) draws
 * through {@link TaskIcon}, so icons are always colored and stay consistent —
 * no per-context CSS filters, no black-gray fallbacks.
 */
export interface TaskIconDef {
  color: string;
  src: string;
}

export const TASK_ICON_REGISTRY: Record<string, TaskIconDef> = {
  FLINK_SQL: { color: "#e6526f", src: flinkIcon },
  FLINK_JAR: { color: "#e6526f", src: flinkIcon },
  COMMON_JAR: { color: "#6f42c1", src: joinIcon },
  CLICKHOUSE_SQL: { color: "#e8a317", src: sqlIcon },
  MYSQL_SQL: { color: "#2f6fdb", src: sqlIcon },
  HIVE_SQL: { color: "#e8a317", src: hiveIcon },
  SHELL: { color: "#2e9e4f", src: shellIcon },
  CONDITION: { color: "#d48806", src: joinIcon },
  DEPENDENT: { color: "#13a8a8", src: dependIcon },
  SUB_FLOW: { color: "var(--ant-color-primary)", src: flowIcon },
  workflow: { color: "var(--ant-color-primary)", src: flowIcon },
  group: { color: "#8c8c8c", src: flowIcon },
};

const FALLBACK: TaskIconDef = { color: "var(--ant-color-primary)", src: flowIcon };

/** Resolve a type key to its icon (exact, case-insensitive on the key). */
export function getTaskIcon(type: string | undefined | null): TaskIconDef {
  if (!type) return FALLBACK;
  return TASK_ICON_REGISTRY[type] ?? TASK_ICON_REGISTRY[type.toUpperCase()] ?? FALLBACK;
}

export interface TaskIconProps {
  type: string | undefined | null;
  /** Rendered box size in px (square). */
  size?: number;
  /** Override the registry color (defaults to the type's brand color). */
  color?: string;
  style?: React.CSSProperties;
}

/**
 * Colorizes a monochrome SVG via CSS mask, so a single color value drives the
 * glyph regardless of the source SVG's own fill.
 */
export function TaskIcon({ type, size = 16, color, style }: TaskIconProps) {
  const def = getTaskIcon(type);
  // Quote the URL: Vite inlines small SVGs as data: URIs whose raw quotes/commas
  // break an unquoted url() and silently drop the mask. Longhand props avoid the
  // shorthand's `/ contain` size parse quirk.
  const maskUrl = `url("${def.src}")`;
  return (
    <span
      role="img"
      aria-label={type ?? "task"}
      style={{
        display: "inline-block",
        width: size,
        height: size,
        flexShrink: 0,
        verticalAlign: "middle",
        backgroundColor: color ?? def.color,
        WebkitMaskImage: maskUrl,
        maskImage: maskUrl,
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
        WebkitMaskSize: "contain",
        maskSize: "contain",
        ...style,
      }}
    />
  );
}
