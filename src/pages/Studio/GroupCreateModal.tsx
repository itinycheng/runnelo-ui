import { useState } from "react";
import { useJobStore } from "@/stores/jobStore";
import { findNodeById } from "@/utils/tree";
import { GroupEditModal } from "./GroupEditModal";

interface GroupCreateModalProps {
  open: boolean;
  /** Empty string creates a root; otherwise the new group is one level below this parent. */
  parentId: string;
  onClose: () => void;
}

export default function GroupCreateModal({ open, parentId, onClose }: GroupCreateModalProps) {
  const [saving, setSaving] = useState(false);
  const createGroup = useJobStore((state) => state.createGroup);
  const treeData = useJobStore((state) => state.treeData);
  const siblings = parentId ? (findNodeById(treeData, parentId)?.children ?? []) : treeData;
  const siblingNames = siblings.filter((node) => node.kind === "group").map((node) => node.name);

  const save = async (name: string) => {
    setSaving(true);
    try {
      await createGroup(name, parentId);
      onClose();
    } catch {
      // The request interceptor reports mock API errors; keep the modal open.
    } finally {
      setSaving(false);
    }
  };

  return (
    <GroupEditModal
      open={open}
      mode="create"
      confirmLoading={saving}
      siblingNames={siblingNames}
      onOk={save}
      onCancel={onClose}
    />
  );
}
