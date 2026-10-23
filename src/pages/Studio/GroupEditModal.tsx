import { useEffect } from "react";
import { Form, Input, Modal } from "antd";
import { useTranslation } from "react-i18next";

interface GroupEditModalProps {
  open: boolean;
  /** "create" for a new group, "rename" for an existing one. */
  mode: "create" | "rename";
  initialName?: string;
  confirmLoading?: boolean;
  /** Names of same-level groups (excluding self) used to reject duplicates. */
  siblingNames?: string[];
  onOk: (name: string) => void | Promise<void>;
  onCancel: () => void;
}

const EMPTY: string[] = [];

/**
 * Name a job group. Reused for both creating and renaming; a future optional
 * parent-group selector can be added as another Form.Item without touching
 * callers (they already pass the target level's siblings).
 */
export function GroupEditModal({
  open,
  mode,
  initialName = "",
  confirmLoading = false,
  siblingNames = EMPTY,
  onOk,
  onCancel,
}: GroupEditModalProps) {
  const { t } = useTranslation();
  const [form] = Form.useForm<{ name: string }>();

  useEffect(() => {
    if (open) form.setFieldsValue({ name: initialName });
  }, [open, initialName, form]);

  const handleOk = async () => {
    const { name } = await form.validateFields();
    await onOk(name.trim());
  };

  return (
    <Modal
      title={t(mode === "create" ? "workflow.addGroup" : "workflow.renameGroup")}
      open={open}
      confirmLoading={confirmLoading}
      onOk={handleOk}
      onCancel={onCancel}
      destroyOnHidden
      data-testid="group-edit-modal"
    >
      <Form form={form} layout="vertical" preserve={false}>
        <Form.Item
          name="name"
          label={t("workflow.groupName")}
          rules={[
            { required: true, whitespace: true, message: t("workflow.groupNameRequired") },
            {
              validator: (_, value: string) => {
                const v = (value ?? "").trim();
                return v && siblingNames.includes(v)
                  ? Promise.reject(new Error(t("workflow.groupNameDuplicate")))
                  : Promise.resolve();
              },
            },
          ]}
        >
          <Input
            autoFocus
            maxLength={64}
            placeholder={t("workflow.groupNamePlaceholder")}
            onPressEnter={handleOk}
            data-testid="group-name-input"
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
