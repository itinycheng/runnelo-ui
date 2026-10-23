import { useMemo, useRef, useState } from "react";
import { Button, Form, Input, Modal, Select, Tag, message, type FormInstance } from "antd";
import { ClearOutlined, DeleteOutlined, EditOutlined, PlusOutlined, SettingOutlined } from "@ant-design/icons";
import { ProTable, type ActionType, type ProColumns } from "@ant-design/pro-components";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import type { SysConfig } from "@/types/admin";
import { createSysConfig, deleteSysConfig, getSysConfigs, purgeSysConfig, updateSysConfig } from "@/api/admin";
import RowActions from "@/components/RowActions";
import { enumOptions } from "@/constants/enums";
import { useAuthPermissions } from "@/stores/authStore";
import { hasPermission } from "@/utils/permission";
import { enumColor, statusColor } from "@/utils/statusColor";

type SysConfigFormValue = Omit<SysConfig, "id" | "createdAt" | "updatedAt">;

function SysConfigTypeTag() {
  const { t } = useTranslation();
  return <Tag color={enumColor("FLINK")}>{t("sysConfig.typeFlink")}</Tag>;
}

function SysConfigStatusTag({ status }: { status: SysConfig["status"] }) {
  const { t } = useTranslation();
  return <Tag color={statusColor(status)}>{t(`enums.Status.${status}`)}</Tag>;
}

interface ActionsProps {
  record: SysConfig;
  onEdit: (record: SysConfig) => void;
  onDelete: (id: string) => void;
  onPurge: (id: string) => void;
}

function SysConfigActions({ record, onEdit, onDelete, onPurge }: ActionsProps) {
  const { t } = useTranslation();
  const deleted = record.status === "DELETED";
  return (
    <RowActions
      actions={[
        {
          key: "edit",
          tooltip: t("common.edit"),
          icon: <EditOutlined />,
          onClick: () => onEdit(record),
          hidden: deleted,
        },
        {
          key: "delete",
          tooltip: t("common.delete"),
          icon: <DeleteOutlined />,
          danger: true,
          confirm: t("sysConfig.deleteConfirmDesc", { name: record.name }),
          onClick: () => onDelete(record.id),
          hidden: deleted,
        },
        {
          key: "purge",
          tooltip: t("sysConfig.purge"),
          icon: <ClearOutlined />,
          danger: true,
          confirm: t("sysConfig.purgeConfirmDesc", { name: record.name }),
          onClick: () => onPurge(record.id),
          hidden: !deleted,
        },
      ]}
    />
  );
}

interface ModalProps {
  open: boolean;
  isEdit: boolean;
  form: FormInstance<SysConfigFormValue>;
  confirmLoading: boolean;
  onOk: () => void;
  onCancel: () => void;
}

function SysConfigFormModal({ open, isEdit, form, confirmLoading, onOk, onCancel }: ModalProps) {
  const { t } = useTranslation();
  return (
    <Modal
      title={t(isEdit ? "sysConfig.editTitle" : "sysConfig.addTitle")}
      open={open}
      width={720}
      onOk={onOk}
      onCancel={onCancel}
      confirmLoading={confirmLoading}
      destroyOnHidden
      data-testid="sysconfig-modal"
    >
      <Form form={form} layout="vertical">
        <Form.Item name="name" label={t("common.name")} rules={[{ required: true }]}>
          <Input maxLength={64} placeholder={t("sysConfig.namePlaceholder")} />
        </Form.Item>
        <Form.Item name="type" label={t("common.type")} rules={[{ required: true }]}>
          <Select options={[{ value: "FLINK", label: t("sysConfig.typeFlink") }]} />
        </Form.Item>
        <Form.Item name="version" label={t("sysConfig.version")} rules={[{ required: true }]}>
          <Input maxLength={32} placeholder={t("sysConfig.versionPlaceholder")} />
        </Form.Item>
        <Form.Item name="status" label={t("common.status")} rules={[{ required: true }]}>
          <Select options={enumOptions(["ENABLE", "DISABLE"] as const, "Status", t)} />
        </Form.Item>
        <Form.Item name={["config", "commandPath"]} label={t("sysConfig.commandPath")} rules={[{ required: true }]}>
          <Input placeholder={t("sysConfig.commandPathPlaceholder")} />
        </Form.Item>
        <Form.Item name={["config", "jarFile"]} label={t("sysConfig.jarFile")} rules={[{ required: true }]}>
          <Input placeholder={t("sysConfig.jarFilePlaceholder")} />
        </Form.Item>
        <Form.Item name={["config", "className"]} label={t("sysConfig.className")} rules={[{ required: true }]}>
          <Input placeholder={t("sysConfig.classNamePlaceholder")} />
        </Form.Item>
        <Form.Item name={["config", "libDirs"]} label={t("sysConfig.libDirs")}>
          <Input placeholder={t("sysConfig.libDirsPlaceholder")} />
        </Form.Item>
        <Form.Item name="description" label={t("common.description")}>
          <Input.TextArea placeholder={t("sysConfig.descriptionPlaceholder")} rows={3} />
        </Form.Item>
      </Form>
    </Modal>
  );
}

function isFormValidationError(error: unknown): boolean {
  return !!error && typeof error === "object" && "errorFields" in error;
}

function useSysConfigCrud() {
  const { t } = useTranslation();
  const actionRef = useRef<ActionType>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<SysConfig | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [form] = Form.useForm<SysConfigFormValue>();

  const closeModal = () => {
    setModalOpen(false);
    form.resetFields();
    setEditingConfig(null);
  };
  const handleAdd = () => {
    setEditingConfig(null);
    form.resetFields();
    form.setFieldsValue({ type: "FLINK", status: "ENABLE", config: { type: "FLINK" } } as SysConfigFormValue);
    setModalOpen(true);
  };
  const handleEdit = (record: SysConfig) => {
    setEditingConfig(record);
    form.setFieldsValue(record);
    setModalOpen(true);
  };
  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      const payload = { ...values, config: { ...values.config, type: values.type } };
      setConfirmLoading(true);
      if (editingConfig) await updateSysConfig(editingConfig.id, payload);
      else await createSysConfig(payload);
      void message.success(t(editingConfig ? "common.updateSuccess" : "common.createSuccess"));
      closeModal();
      void actionRef.current?.reload();
    } catch (error) {
      if (isFormValidationError(error)) return;
    } finally {
      setConfirmLoading(false);
    }
  };
  const runRowAction = async (action: (id: string) => Promise<unknown>, id: string, successMessage: string) => {
    try {
      await action(id);
      void message.success(successMessage);
      void actionRef.current?.reload();
    } catch {
      // handled by the global interceptor toast
    }
  };

  return {
    actionRef,
    modalOpen,
    editingConfig,
    confirmLoading,
    form,
    handleAdd,
    handleEdit,
    handleModalOk,
    closeModal,
    handleDelete: (id: string) => runRowAction(deleteSysConfig, id, t("common.deleteSuccess")),
    handlePurge: (id: string) => runRowAction(purgeSysConfig, id, t("sysConfig.purgeSuccess")),
  };
}

function useSysConfigColumns(
  canManage: boolean,
  crud: ReturnType<typeof useSysConfigCrud>,
  t: TFunction,
): ProColumns<SysConfig>[] {
  return useMemo(
    () => [
      { title: t("common.name"), dataIndex: "name", key: "name", width: 170, ellipsis: true, fixed: "left" },
      {
        title: t("common.type"),
        dataIndex: "type",
        key: "type",
        width: 110,
        search: false,
        render: () => <SysConfigTypeTag />,
      },
      { title: t("sysConfig.version"), dataIndex: "version", key: "version", width: 80, search: false },
      {
        title: t("common.status"),
        dataIndex: "status",
        key: "status",
        width: 100,
        valueType: "select",
        valueEnum: {
          ENABLE: { text: t("enums.Status.ENABLE") },
          DISABLE: { text: t("enums.Status.DISABLE") },
          DELETED: { text: t("enums.Status.DELETED") },
        },
        render: (_, record) => <SysConfigStatusTag status={record.status} />,
      },
      {
        title: t("sysConfig.commandPath"),
        dataIndex: ["config", "commandPath"],
        width: 200,
        search: false,
        ellipsis: true,
      },
      { title: t("common.description"), dataIndex: "description", width: 220, search: false, ellipsis: true },
      {
        title: t("common.updatedAt"),
        dataIndex: "updatedAt",
        valueType: "dateTime",
        width: 180,
        search: false,
      },
      ...(canManage
        ? [
            {
              title: t("common.operation"),
              key: "action",
              width: 110,
              fixed: "right",
              search: false,
              render: (_: unknown, record: SysConfig) => (
                <SysConfigActions
                  record={record}
                  onEdit={crud.handleEdit}
                  onDelete={crud.handleDelete}
                  onPurge={crud.handlePurge}
                />
              ),
            } satisfies ProColumns<SysConfig>,
          ]
        : []),
    ],
    [canManage, crud.handleDelete, crud.handleEdit, crud.handlePurge, t],
  );
}

export default function SysConfigList() {
  const { t } = useTranslation();
  const canManage = hasPermission(useAuthPermissions(), "SYSTEM_MANAGE");
  const crud = useSysConfigCrud();
  const columns = useSysConfigColumns(canManage, crud, t);

  return (
    <div data-testid="sysconfig-list">
      <ProTable<SysConfig>
        headerTitle={
          <h1 className="app-page-title" style={{ margin: 0 }}>
            {t("sysConfig.title")}
          </h1>
        }
        actionRef={crud.actionRef}
        rowKey="id"
        columns={columns}
        search={{ filterType: "light" }}
        options={{
          reload: false,
          density: false,
          setting: {
            draggable: false,
            children: (
              <Button type="text" aria-label={t("common.columnSettings")} icon={<SettingOutlined aria-hidden />} />
            ),
          },
        }}
        columnsState={{ defaultValue: { name: { fixed: "left" }, action: { fixed: "right", disable: true } } }}
        tableLayout="fixed"
        scroll={{ x: 1170 }}
        toolBarRender={() => [
          <Button key="refresh" onClick={() => void crud.actionRef.current?.reload()}>
            {t("common.refresh")}
          </Button>,
          ...(canManage
            ? [
                <Button key="add" type="primary" icon={<PlusOutlined />} onClick={crud.handleAdd}>
                  {t("sysConfig.add")}
                </Button>,
              ]
            : []),
        ]}
        request={async (params) => {
          const result = await getSysConfigs({
            page: params.current ?? 1,
            pageSize: params.pageSize ?? 10,
            name: params.name,
            status: params.status,
          });
          return { data: result.data, total: result.total, success: true };
        }}
        pagination={{ defaultPageSize: 10, showSizeChanger: true }}
      />
      <SysConfigFormModal
        open={crud.modalOpen}
        isEdit={!!crud.editingConfig}
        form={crud.form}
        confirmLoading={crud.confirmLoading}
        onOk={() => void crud.handleModalOk()}
        onCancel={crud.closeModal}
      />
    </div>
  );
}
