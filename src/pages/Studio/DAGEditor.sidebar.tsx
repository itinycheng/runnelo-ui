import { Flex, Tooltip } from "antd";
import { SIDEBAR_ICON_SIZE } from "./DAGEditor.constants";
import { TaskIcon, getTaskIcon } from "@/components/TaskIcon";
import { JOB_TYPES, type JobType } from "@/constants/enums";
import React from "react";
import { useTranslation } from "react-i18next";

/** SVG task icon for the palette, colored via the shared registry. */
function paletteIcon(type: string): React.ReactNode {
  return <TaskIcon type={type} size={SIDEBAR_ICON_SIZE} />;
}

interface SidebarTaskType {
  type: JobType;
  icon: React.ReactNode;
  color?: string;
}

const SIDEBAR_TASK_TYPES: SidebarTaskType[] = JOB_TYPES.map((type) => ({
  type,
  icon: paletteIcon(type),
  color: getTaskIcon(type).color,
}));

export function TaskSidebar() {
  const { t } = useTranslation();
  return (
    <Flex
      vertical
      align="center"
      style={{
        width: 48,
        flexShrink: 0,
        background: "#fff",
        borderTop: "1px solid var(--ant-color-border-secondary)",
        borderRight: "1px solid var(--ant-color-border-secondary)",
        overflowY: "auto",
        scrollbarWidth: "none",
        padding: "5px 0",
        gap: 4,
      }}
    >
      {SIDEBAR_TASK_TYPES.map((item) => {
        const label = t(`enums.JobType.${item.type}`);
        return (
          <Tooltip key={item.type} title={label} placement="right">
            <Flex
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData("application/reactflow-type", item.type);
                e.dataTransfer.setData("application/reactflow-label", label);
                e.dataTransfer.effectAllowed = "move";
              }}
              align="center"
              justify="center"
              style={{
                width: 36,
                height: 36,
                cursor: "grab",
                fontSize: 18,
                color: item.color,
                background: "var(--ant-color-bg-container)",
                border: "1px solid var(--ant-color-border-secondary)",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                if (item.color) {
                  e.currentTarget.style.borderColor = item.color;
                  e.currentTarget.style.boxShadow = `0 0 0 1px ${item.color}33`;
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--ant-color-border-secondary)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              {item.icon}
            </Flex>
          </Tooltip>
        );
      })}
    </Flex>
  );
}
