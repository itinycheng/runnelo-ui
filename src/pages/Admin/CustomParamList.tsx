import { useMemo, useState } from "react";
import { Button, Form, Input, Modal, Select, Tag, message, type FormInstance } from "antd";
import { DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import { ProTable, type ProColumns } from "@ant-design/pro-components";
import { useTranslation } from "react-i18next";
import type { CustomParam } from "@/types/admin";
import { createParam, deleteParam, getParams, updateParam } from "@/api/admin";
import RowActions from "@/components/RowActions";
import { JOB_PARAM_TYPES, enumOptions } from "@/constants/enums";
import { useInvalidateWorkspaceList, useWorkspacePageQuery } from "@/app/useWorkspacePageQuery";
import { enumColor } from "@/utils/statusColor";

function ParamTypeTag({ type }: { type: CustomParam["type"] }) {
  const { t } = useTranslation();
  return <Tag color={enumColor(type)}>{t(`enums.JobParamType.${type}`)}</Tag>;
}

interface ParamActionsCellProps {
  record: CustomParam;
  onEdit: (record: CustomParam) => void;
  onDelete: (id: string) => void;
}

function ParamActionsCell({ record, onEdit, onDelete }: ParamActionsCellProps) {
  const { t } = useTranslation();
  return (
    <RowActions
      actions={[
        {
          key: "edit",
          tooltip: t("common.edit"),
          icon: <EditOutlined />,
          onClick: () => onEdit(record),
        },
        {
          key: "delete",
          tooltip: t("common.delete"),
          icon: <DeleteOutlined />,
          danger: true,
          confirm: t("param.deleteConfirmDesc", { name: record.paramName }),
          onClick: () => onDelete(record.id),
        },
      ]}
    />
  );
}

interface ParamFormModalProps {
  open: boolean;
  isEdit: boolean;
  form: FormInstance;
  confirmLoading: boolean;
  onOk: () => void;
  onCancel: () => void;
}

function ParamFormModal({ open, isEdit, form, confirmLoading, onOk, onCancel }: ParamFormModalProps) {
  const { t } = useTranslation();
  const type = Form.useWatch("type", form) as string | undefined;
  return (
    <Modal
      title={isEdit ? t("param.editTitle") : t("param.addTitle")}
      open={open}
      onOk={onOk}
      onCancel={onCancel}
      confirmLoading={confirmLoading}
      destroyOnHidden
      data-testid="custom-param-modal"
    >
      <Form form={form} layout="vertical" data-testid="custom-param-form">
        <Form.Item
          name="paramName"
          label={t("param.nameLabel")}
          rules={[{ required: true, message: t("param.namePlaceholder") }]}
        >
          <Input placeholder={t("param.namePlaceholder")} data-testid="input-name" />
        </Form.Item>
        <Form.Item
          name="paramValue"
          label={t("param.valueLabel")}
          rules={[{ required: true, message: t("param.valuePlaceholder") }]}
        >
          <Input.TextArea placeholder={t("param.valuePlaceholder")} rows={2} data-testid="input-value" />
        </Form.Item>
        <Form.Item
          name="type"
          label={t("common.type")}
          rules={[{ required: true, message: t("param.typePlaceholder") }]}
        >
          <Select
            placeholder={t("param.typePlaceholder")}
            options={enumOptions(JOB_PARAM_TYPES, "JobParamType", t)}
            data-testid="select-type"
          />
        </Form.Item>
        {type === "JOB_FLOW" && (
          <Form.Item
            name="flowId"
            label={t("param.flowIdLabel")}
            rules={[{ required: true, message: t("param.flowIdPlaceholder") }]}
          >
            <Input placeholder={t("param.flowIdPlaceholder")} data-testid="input-flow-id" />
          </Form.Item>
        )}
        <Form.Item name="description" label={t("common.description")}>
          <Input.TextArea placeholder={t("param.descriptionPlaceholder")} rows={3} data-testid="input-description" />
        </Form.Item>
      </Form>
    </Modal>
  );
}

// NOTE: This hook is structurally near-identical to useUserCrud in UserList.
// If a third CRUD list page appears, consider extracting a generic
// `useModalForm<T>()` hook.

function isFormValidationError(error: unknown): boolean {
  return !!error && typeof error === "object" && "errorFields" in error;
}

function useParamCrud() {
  const { t } = useTranslation();
  const invalidate = useInvalidateWorkspaceList("params");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingParam, setEditingParam] = useState<CustomParam | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [form] = Form.useForm();

  const handleAdd = () => {
    setEditingParam(null);
    form.resetFields();
    setModalOpen(true);
  };

  const handleEdit = (record: CustomParam) => {
    setEditingParam(record);
    form.setFieldsValue({
      paramName: record.paramName,
      paramValue: record.paramValue,
      type: record.type,
      flowId: record.flowId ?? "",
      description: record.description ?? "",
    });
    setModalOpen(true);
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      setConfirmLoading(true);
      if (editingParam) {
        await updateParam(editingParam.id, values);
        message.success(t("common.updateSuccess"));
      } else {
        await createParam(values);
        message.success(t("common.createSuccess"));
      }
      setModalOpen(false);
      form.resetFields();
      setEditingParam(null);
      await invalidate();
    } catch (error) {
      if (isFormValidationError(error)) return;
    } finally {
      setConfirmLoading(false);
    }
  };

  const handleModalCancel = () => {
    setModalOpen(false);
    form.resetFields();
    setEditingParam(null);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteParam(id);
      message.success(t("common.deleteSuccess"));
      await invalidate();
    } catch {
      // handled by the global interceptor toast
    }
  };

  return {
    modalOpen,
    editingParam,
    confirmLoading,
    form,
    handleAdd,
    handleEdit,
    handleModalOk,
    handleModalCancel,
    handleDelete,
  };
}

export default function CustomParamList() {
  const { t } = useTranslation();
  const crud = useParamCrud();
  const page = useWorkspacePageQuery("params", getParams);

  const columns = useMemo<ProColumns<CustomParam>[]>(
    () => [
      { title: t("param.nameLabel"), dataIndex: "paramName", key: "paramName", ellipsis: true },
      { title: t("param.valueLabel"), dataIndex: "paramValue", key: "paramValue", ellipsis: true },
      {
        title: t("common.type"),
        dataIndex: "type",
        key: "type",
        width: 100,
        render: (_, r) => <ParamTypeTag type={r.type} />,
      },
      { title: t("common.description"), dataIndex: "description", key: "description", ellipsis: true },
      {
        title: t("common.operation"),
        key: "action",
        width: 150,
        render: (_, record) => (
          <ParamActionsCell record={record} onEdit={crud.handleEdit} onDelete={crud.handleDelete} />
        ),
      },
    ],
    [t, crud.handleEdit, crud.handleDelete],
  );

  return (
    <div data-testid="custom-param-list">
      <ProTable<CustomParam>
        headerTitle={t("param.title")}
        rowKey="id"
        columns={columns}
        dataSource={page.data}
        loading={page.loading}
        search={false}
        toolBarRender={() => [
          <Button
            key="add"
            type="primary"
            icon={<PlusOutlined />}
            onClick={crud.handleAdd}
            data-testid="add-param-button"
          >
            {t("param.addButton")}
          </Button>,
        ]}
        pagination={{ ...page.pagination, total: page.total }}
      />
      <ParamFormModal
        open={crud.modalOpen}
        isEdit={!!crud.editingParam}
        form={crud.form}
        confirmLoading={crud.confirmLoading}
        onOk={crud.handleModalOk}
        onCancel={crud.handleModalCancel}
      />
    </div>
  );
}
