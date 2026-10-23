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
import { TASK_TYPE_ICON_COLORS, TASK_TYPE_ICON_FALLBACK_COLOR } from "@/constants/taskTypeIconColors";
import React from "react";

/**
 * Single source of truth for task/workflow glyphs. Default type colors come
 * from TASK_TYPE_ICON_COLORS; surfaces such as the tree may override the color
 * when it represents a different, explicitly labeled state.
 */
export interface TaskIconDef {
  color: string;
  src: string;
}

export const TASK_ICON_REGISTRY: Record<string, TaskIconDef> = {
  FLINK_SQL: { color: TASK_TYPE_ICON_COLORS.FLINK_SQL, src: flinkIcon },
  FLINK_JAR: { color: TASK_TYPE_ICON_COLORS.FLINK_JAR, src: flinkIcon },
  COMMON_JAR: { color: TASK_TYPE_ICON_COLORS.COMMON_JAR, src: joinIcon },
  CLICKHOUSE_SQL: { color: TASK_TYPE_ICON_COLORS.CLICKHOUSE_SQL, src: sqlIcon },
  MYSQL_SQL: { color: TASK_TYPE_ICON_COLORS.MYSQL_SQL, src: sqlIcon },
  HIVE_SQL: { color: TASK_TYPE_ICON_COLORS.HIVE_SQL, src: hiveIcon },
  SHELL: { color: TASK_TYPE_ICON_COLORS.SHELL, src: shellIcon },
  CONDITION: { color: TASK_TYPE_ICON_COLORS.CONDITION, src: joinIcon },
  DEPENDENT: { color: TASK_TYPE_ICON_COLORS.DEPENDENT, src: dependIcon },
  SUB_FLOW: { color: TASK_TYPE_ICON_COLORS.SUB_FLOW, src: flowIcon },
  workflow: { color: TASK_TYPE_ICON_COLORS.workflow, src: flowIcon },
  group: { color: TASK_TYPE_ICON_COLORS.group, src: flowIcon },
};

const FALLBACK: TaskIconDef = { color: TASK_TYPE_ICON_FALLBACK_COLOR, src: flowIcon };

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
  /** Accessible label when the color carries extra meaning in this context. */
  label?: string;
  style?: React.CSSProperties;
}

/**
 * Colorizes a monochrome SVG via CSS mask, so a single color value drives the
 * glyph regardless of the source SVG's own fill.
 */
export function TaskIcon({ type, size = 16, color, label, style }: TaskIconProps) {
  const def = getTaskIcon(type);
  // Quote the URL: Vite inlines small SVGs as data: URIs whose raw quotes/commas
  // break an unquoted url() and silently drop the mask. Longhand props avoid the
  // shorthand's `/ contain` size parse quirk.
  const maskUrl = `url("${def.src}")`;
  return (
    <span
      role="img"
      aria-label={label ?? type ?? "task"}
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
