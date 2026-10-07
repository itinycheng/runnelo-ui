import React, { useEffect } from "react";
import { Button, Flex, Form, Tooltip, Typography } from "antd";
import { ArrowLeftOutlined, SaveOutlined, CloseOutlined, UnorderedListOutlined } from "@ant-design/icons";
import type { MessageInstance } from "antd/es/message/interface";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import type { Node } from "@xyflow/react";
import { getTaskTypeDef } from "@/pages/Studio/tasks/registry";
import CodeEditor from "@/components/CodeEditor";
import type { JobType } from "@/constants/enums";

/** Adapter so CodeEditor works as a Form.Item child (Form injects value/onChange). */
function CodeField({
  value,
  onChange,
  taskType,
}: {
  value?: string;
  onChange?: (v: string) => void;
  taskType: JobType;
}) {
  return <CodeEditor value={value ?? ""} onChange={onChange ?? (() => {})} taskType={taskType} minHeight={160} />;
}

interface DAGToolbarProps {
  embedded: boolean;
  onSave: () => void;
  taskListOpen: boolean;
  onToggleTaskList: () => void;
}

export function DAGToolbar({ embedded, onSave, taskListOpen, onToggleTaskList }: DAGToolbarProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <Flex
      style={{
        background: "var(--ant-color-bg-elevated)",
        padding: "4px 6px",
        boxShadow: "var(--ant-box-shadow-tertiary)",
        borderRadius: "var(--ant-border-radius)",
      }}
    >
      {!embedded && (
        <Tooltip title={t("common.back")}>
          <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate("/studio")} />
        </Tooltip>
      )}
      <Tooltip title={t("dag.saveFlow")}>
        <Button type="text" icon={<SaveOutlined style={{ color: "var(--ant-color-primary)" }} />} onClick={onSave} />
      </Tooltip>
      <Tooltip title={t("dag.taskList")}>
        <Button type={taskListOpen ? "primary" : "text"} icon={<UnorderedListOutlined />} onClick={onToggleTaskList} />
      </Tooltip>
    </Flex>
  );
}

interface BottomPanelHeaderProps {
  label: string;
  typeLabel: string;
  onSave: () => void;
  onClose: () => void;
  saveLabel: string;
  closeLabel: string;
}

function BottomPanelHeader({ label, typeLabel, onSave, onClose, saveLabel, closeLabel }: BottomPanelHeaderProps) {
  return (
    <Flex
      align="center"
      justify="space-between"
      style={{
        padding: "2px 12px",
        borderBottom: "1px solid var(--ant-color-border-secondary)",
        background: "var(--ant-color-bg-layout)",
      }}
    >
      <Flex align="center" gap={8}>
        <Typography.Text strong>{label}</Typography.Text>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          {typeLabel}
        </Typography.Text>
      </Flex>
      <Flex align="center" gap={4}>
        <Button size="small" icon={<SaveOutlined />} onClick={onSave}>
          {saveLabel}
        </Button>
        <Button size="small" icon={<CloseOutlined />} onClick={onClose}>
          {closeLabel}
        </Button>
      </Flex>
    </Flex>
  );
}

interface BottomPanelProps {
  node: Node;
  panelHeight: number;
  onResizeMouseDown: (e: React.MouseEvent) => void;
  onClose: () => void;
  /** Persist edited config/subject back onto the canvas node (inlined into the FlowGraph). */
  onSaveNode: (nodeId: string, patch: { config?: Record<string, unknown>; subject?: string }) => void;
  messageApi: MessageInstance;
}

/** The per-type config fields (from the registry) + optional subject editor, bound to the node. */
function NodeConfigBody({ node }: { node: Node }) {
  const { t } = useTranslation();
  const def = getTaskTypeDef(node.data.taskType as JobType);
  if (!def) return <Typography.Text type="secondary">{t("dag.noFormForType")}</Typography.Text>;
  return (
    <>
      <def.ConfigFields />
      {def.needsSubject && (
        <Form.Item name="subject" label={t("taskForm.subject")} rules={[{ required: true }]}>
          <CodeField taskType={def.type} />
        </Form.Item>
      )}
    </>
  );
}

export function BottomPanel({
  node,
  panelHeight,
  onResizeMouseDown,
  onClose,
  onSaveNode,
  messageApi,
}: BottomPanelProps) {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const taskType = node.data.taskType as JobType | undefined;
  const typeLabel = t(getTaskTypeDef(taskType as JobType)?.labelKey ?? "");

  // `type` is set (not rendered) so ConfigFields' Form.useWatch("type") resolves the datasource filter.
  useEffect(() => {
    form.setFieldsValue({
      type: taskType,
      config: (node.data.config as Record<string, unknown>) ?? {},
      subject: (node.data.subject as string) ?? "",
    });
  }, [node, taskType, form]);

  const handleSaveNode = async () => {
    try {
      const values = await form.validateFields();
      onSaveNode(node.id, { config: values.config, subject: values.subject });
      void messageApi.success(t("common.saveSuccess"));
    } catch {
      /* validation errors shown inline */
    }
  };

  return (
    <>
      <div
        onMouseDown={onResizeMouseDown}
        style={{ height: 3, cursor: "row-resize", background: "var(--ant-color-border-secondary)", flexShrink: 0 }}
      />
      <div
        style={{
          height: panelHeight,
          flexShrink: 0,
          overflow: "auto",
          background: "var(--ant-color-bg-container)",
          borderTop: "1px solid var(--ant-color-border-secondary)",
        }}
      >
        <BottomPanelHeader
          label={node.data.label as string}
          typeLabel={typeLabel}
          onSave={() => void handleSaveNode()}
          onClose={onClose}
          saveLabel={t("common.save")}
          closeLabel={t("common.close")}
        />
        <Form form={form} layout="vertical" style={{ padding: 16 }}>
          <NodeConfigBody node={node} />
        </Form>
      </div>
    </>
  );
}
