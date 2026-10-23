import { useEffect, useRef, useState } from "react";
import { Button, Flex, Form, Spin, Typography, message } from "antd";
import { SaveOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { useJobStore } from "@/stores/jobStore";
import { KeyValueEditor } from "@/components/form";
import type { JobFlow } from "@/types/entities";

/** Workflow-level parameters (JobFlow.params) as a key/value map. */
export default function ParamsPanel({ nodeId }: { nodeId: string }) {
  const { t } = useTranslation();
  // Untyped form: Ant's strict Store typing rejects JobFlow.params (Record<string, unknown>).
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [messageApi, ctx] = message.useMessage();
  const loadJobFlow = useJobStore((s) => s.loadJobFlow);
  const saveJobFlow = useJobStore((s) => s.saveJobFlow);
  // Full loaded flow; merge param edits over it so other fields survive the save.
  const loadedRef = useRef<JobFlow | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    void loadJobFlow(nodeId)
      .then((flow) => {
        if (alive && flow) {
          loadedRef.current = flow;
          form.setFieldsValue(flow);
        }
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [nodeId, loadJobFlow, form]);

  const onSave = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      await saveJobFlow(nodeId, { ...(loadedRef.current ?? {}), ...values } as JobFlow);
      void messageApi.success(t("common.saveSuccess"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Spin spinning={loading}>
      {ctx}
      <Flex vertical gap={12} style={{ padding: "0 4px" }}>
        <Typography.Text type="secondary" className="app-meta-text">
          {t("sidePanel.paramsDescription")}
        </Typography.Text>
        <Form form={form} layout="vertical" size="small">
          <Form.Item name="params">
            <KeyValueEditor />
          </Form.Item>
        </Form>
        <Button type="primary" size="small" icon={<SaveOutlined />} loading={saving} onClick={() => void onSave()}>
          {t("common.save")}
        </Button>
      </Flex>
    </Spin>
  );
}
