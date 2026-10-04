import { useState } from "react";
import {
  Handle,
  Position,
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
  type NodeProps,
} from "@xyflow/react";
import { EDGE_STATUS_COLORS, EDGE_STATUS_LABELS, handleStyle, type EdgeStatus } from "./constants";
import { TaskIcon } from "@/components/TaskIcon";
import { EXECUTION_STATUS_VISUALS, STATUS_TOKEN_COLOR } from "@/utils/statusColor";
import type { ExecutionStatus } from "@/constants/enums";

/** Border/dot color when a node carries a run status (used by the read-only run graph). */
const RUN_STATUS_COLOR: Record<string, string> = {
  success: STATUS_TOKEN_COLOR.success,
  failed: STATUS_TOKEN_COLOR.error,
  running: STATUS_TOKEN_COLOR.info,
  killed: STATUS_TOKEN_COLOR.warning,
  waiting: STATUS_TOKEN_COLOR.neutral,
};

function resolveRunStatusColor(status: string | undefined): string | undefined {
  if (!status) return undefined;
  return EXECUTION_STATUS_VISUALS[status as ExecutionStatus]?.color ?? RUN_STATUS_COLOR[status];
}

export function StatusEdge(props: EdgeProps) {
  const { sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style, markerEnd, data } = props;
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });
  const status = (data?.status as EdgeStatus) || "default";
  const labelInfo = EDGE_STATUS_LABELS[status];

  return (
    <>
      <BaseEdge path={edgePath} style={style} markerEnd={markerEnd} />
      {labelInfo && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: "all",
              color: EDGE_STATUS_COLORS[status],
              background: labelInfo.bg,
              border: `1px solid ${EDGE_STATUS_COLORS[status]}`,
              padding: "1px 6px",
              lineHeight: "18px",
            }}
            className="nodrag nopan"
          >
            {labelInfo.text}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

export function TaskNode({ data, selected }: NodeProps) {
  const [hovered, setHovered] = useState(false);
  const desc = data.description as string | undefined;
  const priority = data.priority as string | undefined;
  const taskType = data.taskType as string | undefined;
  const runStatus = data.status as string | undefined;
  const statusColor = resolveRunStatusColor(runStatus);

  const border = selected
    ? "2px solid var(--ant-color-primary)"
    : statusColor
      ? `2px solid ${statusColor}`
      : "1px solid var(--ant-color-border)";

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: "4px 6px",
        border,
        background: "var(--ant-color-bg-container)",
        borderRadius: "var(--ant-border-radius-sm)",
        minWidth: 60,
        textAlign: "center",
        fontSize: 11,
        position: "relative",
        display: "flex",
        alignItems: "center",
        gap: 4,
      }}
    >
      <Handle type="target" position={Position.Top} style={handleStyle} />
      <Handle type="target" position={Position.Left} id="left-in" style={handleStyle} />
      {statusColor && (
        <span
          style={{
            position: "absolute",
            top: -5,
            right: -5,
            width: 9,
            height: 9,
            borderRadius: "50%",
            background: statusColor,
            border: "1.5px solid var(--ant-color-bg-container)",
          }}
        />
      )}
      <TaskIcon type={taskType} size={20} />
      {data.label as string}
      <Handle type="source" position={Position.Bottom} style={handleStyle} />
      <Handle type="source" position={Position.Right} id="right-out" style={handleStyle} />
      {hovered && (desc || priority || taskType) && (
        <div
          className="nodrag nopan"
          style={{
            position: "absolute",
            left: "50%",
            top: "100%",
            transform: "translateX(-50%)",
            marginTop: 6,
            background: "var(--ant-color-bg-spotlight)",
            color: "var(--ant-color-text-light-solid)",
            borderRadius: "var(--ant-border-radius-sm)",
            padding: "4px 8px",
            fontSize: 10,
            lineHeight: "14px",
            whiteSpace: "nowrap",
            zIndex: 10,
            pointerEvents: "none",
          }}
        >
          {taskType && <div>Type: {taskType}</div>}
          {priority && <div>Priority: {priority}</div>}
          {desc && <div>{desc}</div>}
        </div>
      )}
    </div>
  );
}
