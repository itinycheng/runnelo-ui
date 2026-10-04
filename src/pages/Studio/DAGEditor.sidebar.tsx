import { Button, Flex, Tooltip } from "antd";
import { SIDEBAR_ICON_SIZE } from "./DAGEditor.constants";
import { TaskIcon } from "@/components/TaskIcon";
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
}

const SIDEBAR_TASK_TYPES: SidebarTaskType[] = JOB_TYPES.map((type) => ({
  type,
  icon: paletteIcon(type),
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
        background: "var(--ant-color-bg-container)",
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
            <Button
              aria-label={label}
              icon={item.icon}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData("application/reactflow-type", item.type);
                e.dataTransfer.setData("application/reactflow-label", label);
                e.dataTransfer.effectAllowed = "move";
              }}
              style={{
                width: 36,
                height: 36,
                padding: 0,
                cursor: "grab",
                fontSize: 18,
              }}
            />
          </Tooltip>
        );
      })}
    </Flex>
  );
}
