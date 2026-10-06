import { Button, ConfigProvider, Dropdown, Tag, Space, Typography, type MenuProps } from "antd";
import { UserOutlined, LogoutOutlined, SafetyCertificateOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useAuthStore, useAuthPermissions } from "@/stores/authStore";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { compactMenuTheme } from "@/theme";
import { enumColor } from "@/utils/statusColor";

export default function UserAvatar() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const currentWorkspaceId = useWorkspaceStore((s) => s.currentId);
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const effectivePermissions = useAuthPermissions();
  const navigate = useNavigate();
  const { t } = useTranslation();

  if (!user) return null;
  const handleLogout = async () => {
    const redirectUrl = await logout();
    if (redirectUrl) window.location.assign(redirectUrl);
    else void navigate("/login");
  };
  const globalRole = user.roles.global;
  const workspaceRole = currentWorkspaceId != null ? user.roles.workspaces?.[currentWorkspaceId] : undefined;
  const currentWorkspaceName = workspaces.find((w) => w.id === currentWorkspaceId)?.name;
  const accountLabel = `${t("user.account")}: ${user.username}`;

  const items: MenuProps["items"] = [
    {
      key: "info",
      type: "group",
      label: (
        <Typography.Text strong>
          <UserOutlined /> {user.username}
        </Typography.Text>
      ),
    },
    {
      key: "roles",
      disabled: true,
      label: (
        <Space size={4} wrap>
          <Typography.Text type="secondary">{t("user.roles")}:</Typography.Text>
          {globalRole && <Tag color={enumColor(globalRole)}>{t(`enums.Role.${globalRole}`)}</Tag>}
          {workspaceRole && (
            <Tag color={enumColor(workspaceRole)}>
              {currentWorkspaceName ? `${currentWorkspaceName}: ` : ""}
              {t(`enums.Role.${workspaceRole}`)}
            </Tag>
          )}
          {!globalRole && !workspaceRole && <Tag>-</Tag>}
        </Space>
      ),
    },
    { type: "divider" },
    {
      key: "permissions-header",
      disabled: true,
      label: (
        <Typography.Text type="secondary">
          <SafetyCertificateOutlined /> {t("user.permissions")}
        </Typography.Text>
      ),
    },
    ...effectivePermissions.map((perm) => ({
      key: perm,
      disabled: true,
      label: <Tag color={enumColor(perm)}>{t(`enums.Permission.${perm}`)}</Tag>,
    })),
    { type: "divider" as const },
    {
      key: "logout",
      icon: <LogoutOutlined />,
      label: t("user.logout"),
      danger: true,
      onClick: () => void handleLogout(),
    },
  ];

  return (
    <ConfigProvider theme={compactMenuTheme}>
      <Dropdown menu={{ items }} trigger={["click"]} placement="bottomRight">
        <Button type="text" shape="circle" icon={<UserOutlined />} aria-label={accountLabel} />
      </Dropdown>
    </ConfigProvider>
  );
}
