import { useEffect, type ReactNode } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { Button, ConfigProvider, Space, Typography, type ThemeConfig } from "antd";
import { ProLayout, type ProLayoutProps } from "@ant-design/pro-components";
import { useTranslation } from "react-i18next";
import {
  DashboardOutlined,
  SettingOutlined,
  FolderOutlined,
  TeamOutlined,
  ToolOutlined,
  DatabaseOutlined,
  TableOutlined,
  ClusterOutlined,
  TagsOutlined,
  HistoryOutlined,
  PartitionOutlined,
  BellOutlined,
  ConsoleSqlOutlined,
  AppstoreOutlined,
  AuditOutlined,
  SlidersOutlined,
  MenuOutlined,
} from "@ant-design/icons";
import UserAvatar from "@/components/UserAvatar";
import LangSwitcher from "@/components/LangSwitcher";
import ThemeSwitcher from "@/components/ThemeSwitcher";
import BrandLogo from "@/components/BrandLogo";
import WorkspaceSwitcher from "@/components/WorkspaceSwitcher";
import { APP } from "@/config";
import { PAGE_PADDING } from "@/constants/layout";
import { useAuthStore, useAuthPermissions } from "@/stores/authStore";
import { hasPermission } from "@/utils/permission";
import { getRoutePermission } from "@/router/routes";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { useThemeStore } from "@/stores/themeStore";
import { APP_HEADER_HEIGHT, appLayoutTokens, type ThemePresetKey } from "@/theme";
import { EnvironmentHeader, EnvironmentWatermark } from "@/components/EnvironmentIdentity";

type TFunc = (key: string) => string;

type LayoutRoute = NonNullable<ProLayoutProps["route"]>;
type LayoutRouteItem = NonNullable<LayoutRoute["routes"]>[number];

const headerActionTheme: ThemeConfig = {
  components: { Button: { onlyIconSize: 16 } },
};

function HeaderActions() {
  return (
    <ConfigProvider theme={headerActionTheme}>
      <Space size={4}>
        <ThemeSwitcher />
        <LangSwitcher />
        <UserAvatar />
      </Space>
    </ConfigProvider>
  );
}

/**
 * Recursively drop menu items the current user lacks the route's Permission
 * for. Parent groups (e.g. "Admin") are kept as long as at least one child
 * survives — group visibility follows its children, not its own bare route.
 */
function filterMenuByPermission(
  items: LayoutRouteItem[] | undefined,
  effective: ReturnType<typeof useAuthPermissions>,
): LayoutRouteItem[] | undefined {
  if (!items) return items;
  const filtered = items
    .map((item): LayoutRouteItem | null => {
      if (item.routes && item.routes.length > 0) {
        const children = filterMenuByPermission(item.routes, effective);
        if (!children || children.length === 0) return null;
        return { ...item, routes: children };
      }
      const permission = item.path ? getRoutePermission(item.path) : undefined;
      if (permission && !hasPermission(effective, permission)) return null;
      return item;
    })
    .filter((item): item is LayoutRouteItem => item !== null);
  return filtered;
}

function buildLayoutRoutes(t: TFunc): ProLayoutProps["route"] {
  return {
    path: "/",
    routes: [
      { path: "/dashboard", name: t("menu.dashboard"), icon: <DashboardOutlined /> },
      { path: "/studio", name: t("menu.studio"), icon: <PartitionOutlined /> },
      { path: "/query", name: t("menu.query"), icon: <ConsoleSqlOutlined /> },
      { path: "/runs", name: t("menu.runs"), icon: <HistoryOutlined /> },
      {
        path: "/admin",
        name: t("menu.admin"),
        icon: <SettingOutlined />,
        routes: [
          { path: "/admin/resources", name: t("menu.resources"), icon: <FolderOutlined /> },
          { path: "/admin/datasources", name: t("menu.dataSources"), icon: <DatabaseOutlined /> },
          { path: "/admin/catalogs", name: t("menu.catalogs"), icon: <TableOutlined /> },
          { path: "/admin/workers", name: t("menu.workers"), icon: <ClusterOutlined /> },
          { path: "/admin/tags", name: t("menu.tags"), icon: <TagsOutlined /> },
          { path: "/admin/sys-configs", name: t("menu.systemConfig"), icon: <SlidersOutlined /> },
          { path: "/admin/users", name: t("menu.users"), icon: <TeamOutlined /> },
          { path: "/admin/alert-rules", name: t("menu.alertRules"), icon: <BellOutlined /> },
          { path: "/admin/workspaces", name: t("menu.workspaces"), icon: <AppstoreOutlined /> },
          { path: "/admin/params", name: t("menu.customParams"), icon: <ToolOutlined /> },
        ],
      },
      { path: "/audit-logs", name: t("menu.auditLogs"), icon: <AuditOutlined /> },
    ],
  };
}

function currentTopLevelMenuName(route: ProLayoutProps["route"], pathname: string): string | undefined {
  const item = route?.routes?.find(
    (candidate) => candidate.path && (pathname === candidate.path || pathname.startsWith(`${candidate.path}/`)),
  );
  return typeof item?.name === "string" ? item.name : undefined;
}

function renderHeaderTitle(themePreset: ThemePresetKey) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <BrandLogo preset={themePreset} height={26} />
      <EnvironmentHeader />
      {/* Workspace scopes everything below it — a "brand / workspace" breadcrumb reads it as context. */}
      <WorkspaceSwitcher breadcrumb />
      {/* Trailing slash closes the brand+workspace context cluster off from the nav menu. */}
      <span style={{ color: "var(--ant-color-split)", fontSize: 18, fontWeight: 300, userSelect: "none" }}>/</span>
    </div>
  );
}

function MobileNavigationButton({
  collapsed,
  onCollapse,
  currentPageName,
  t,
}: {
  collapsed: boolean;
  onCollapse?: (next: boolean) => void;
  currentPageName?: string;
  t: TFunc;
}) {
  const actionLabel = t(collapsed ? "nav.openNavigation" : "nav.closeNavigation");
  return (
    <Button
      type="text"
      size="small"
      icon={<MenuOutlined aria-hidden />}
      aria-label={currentPageName ? `${actionLabel}: ${currentPageName}` : actionLabel}
      aria-expanded={!collapsed}
      onClick={() => onCollapse?.(!collapsed)}
    >
      {currentPageName}
    </Button>
  );
}

function responsiveHeaderContent(
  props: { isMobile?: boolean; collapsed?: boolean; onCollapse?: (next: boolean) => void },
  defaultDom: ReactNode,
  t: TFunc,
  currentPageName?: string,
): ReactNode {
  return props.isMobile ? (
    <MobileNavigationButton
      collapsed={!!props.collapsed}
      onCollapse={props.onCollapse}
      currentPageName={currentPageName}
      t={t}
    />
  ) : (
    <div style={{ width: "100%", minWidth: 0, overflowX: "auto", overflowY: "hidden" }}>{defaultDom}</div>
  );
}

function DashboardFooter() {
  const { t } = useTranslation();
  return (
    <Typography.Text type="secondary" style={{ textAlign: "center" }}>
      {t("app.footer", { year: new Date().getFullYear(), version: APP.version, appName: APP.name })}
    </Typography.Text>
  );
}

export default function MainLayout() {
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const isStudioPage = location.pathname.startsWith("/studio");
  // Studio (IDE tree) and Query (schema sider + editor) are full-bleed surfaces:
  // no outer page padding, no page scroll — they manage their own regions.
  const isFullBleed = isStudioPage || location.pathname.startsWith("/query");
  const isDashboard = location.pathname === "/dashboard" || location.pathname === "/";
  const title = t("app.title", { appName: APP.name });

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const loadUserInfo = useAuthStore((s) => s.loadUserInfo);
  const effectivePermissions = useAuthPermissions();
  const currentWorkspaceId = useWorkspaceStore((state) => state.currentId);
  const themePreset = useThemeStore((state) => state.preset);

  // A page refresh restores `token` from storage synchronously, but the
  // persisted `user` can be stale (server-side role change, or a workspace
  // switch that just reloaded the page with a new X-Workspace-Id). Refetch on
  // every authenticated mount — MainLayout mounts once per full page load, not
  // per SPA navigation, so this fires once per load rather than per route
  // change. Keep the cached user in place for an instant render; only replace
  // it once the refetch resolves.
  useEffect(() => {
    if (isAuthenticated) {
      loadUserInfo().catch(() => {
        // 401s are already handled by the request interceptor (redirect to /login).
      });
    }
  }, [isAuthenticated, loadUserInfo]);

  const layoutRoutes = buildLayoutRoutes(t);
  const filteredRoutes: ProLayoutProps["route"] = layoutRoutes
    ? { ...layoutRoutes, routes: filterMenuByPermission(layoutRoutes.routes, effectivePermissions) }
    : layoutRoutes;
  const currentPageName = currentTopLevelMenuName(filteredRoutes, location.pathname);

  return (
    <div id="pro-layout-wrapper" style={{ height: "100vh" }}>
      <ProLayout
        key={i18n.language}
        title={title}
        logo={false}
        headerTitleRender={() => renderHeaderTitle(themePreset)}
        headerContentRender={(props, defaultDom) => responsiveHeaderContent(props, defaultDom, t, currentPageName)}
        layout="mix"
        splitMenus
        fixedHeader
        token={appLayoutTokens[themePreset]}
        location={{ pathname: location.pathname }}
        route={filteredRoutes}
        menuItemRender={(item, dom) =>
          item.path ? (
            <Link
              to={item.path}
              onClick={item.onClick}
              onFocus={(event) => event.currentTarget.scrollIntoView?.({ block: "nearest", inline: "nearest" })}
            >
              {dom}
            </Link>
          ) : (
            dom
          )
        }
        actionsRender={() => [<HeaderActions key="header-actions" />]}
        footerRender={isDashboard ? () => <DashboardFooter /> : false}
        contentStyle={{
          display: "flex",
          flexDirection: "column" as const,
          height: isDashboard ? `calc(100vh - ${APP_HEADER_HEIGHT}px - 28px)` : `calc(100vh - ${APP_HEADER_HEIGHT}px)`,
          overflow: "hidden",
          padding: 0,
          margin: 0,
        }}
      >
        <div
          id="page-container-wrapper"
          style={{
            flex: 1,
            minHeight: 0,
            // Full-bleed pages own their scroll; every other page shares one
            // uniform margin + a single scroll container.
            overflow: isFullBleed ? "hidden" : "auto",
            padding: isFullBleed ? 0 : PAGE_PADDING,
          }}
        >
          <Outlet key={currentWorkspaceId ?? "no-workspace"} />
          <EnvironmentWatermark />
        </div>
      </ProLayout>
    </div>
  );
}
