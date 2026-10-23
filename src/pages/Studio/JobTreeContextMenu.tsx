import { Dropdown, type MenuProps } from "antd";
import type { JobTreeNode } from "@/types/job";

interface JobTreeContextMenuProps {
  state: { visible: boolean; x: number; y: number; node: JobTreeNode | null };
  getMenuItems: (node: JobTreeNode) => MenuProps["items"];
  onAction: (key: string, node: JobTreeNode) => void;
}

export default function JobTreeContextMenu({ state, getMenuItems, onAction }: JobTreeContextMenuProps) {
  if (!state.visible || !state.node) return null;
  const node = state.node;
  return (
    <Dropdown open menu={{ items: getMenuItems(node), onClick: ({ key }) => onAction(key, node) }}>
      <div style={{ position: "fixed", left: state.x, top: state.y, width: 1, height: 1 }} />
    </Dropdown>
  );
}
