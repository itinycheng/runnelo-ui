import { useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { Typography } from "antd";
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
} from "@ant-design/icons";
import UserAvatar from "@/components/UserAvatar";
import LangSwitcher from "@/components/LangSwitcher";
import ThemeSwitcher from "@/components/ThemeSwitcher";
import WorkspaceSwitcher from "@/components/WorkspaceSwitcher";
import { APP } from "@/config";
import { PAGE_PADDING } from "@/constants/layout";
import { useAuthStore, useAuthPermissions } from "@/stores/authStore";
import { hasPermission } from "@/utils/permission";
import { getRoutePermission } from "@/router/routes";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { useThemeStore } from "@/stores/themeStore";
import { APP_HEADER_HEIGHT, appLayoutTokens, appPalettes, type ThemePresetKey } from "@/theme";

type TFunc = (key: string) => string;

type LayoutRoute = NonNullable<ProLayoutProps["route"]>;
type LayoutRouteItem = NonNullable<LayoutRoute["routes"]>[number];

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
      {
        path: "/studio",
        name: t("menu.studio"),
        icon: <PartitionOutlined />,
        routes: [{ path: "/studio/list", name: "_jobs", icon: <PartitionOutlined /> }],
      },
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

function renderHeaderTitle(title: string, themePreset: ThemePresetKey) {
  const palette = appPalettes[themePreset];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div
          style={{
            width: 26,
            height: 26,
            background: palette.brand,
            mask: "url(/logo.svg) no-repeat center / contain",
            WebkitMask: "url(/logo.svg) no-repeat center / contain",
          }}
        />
        <span
          style={{
            color: palette.ink,
            fontSize: 20,
            fontWeight: 650,
            letterSpacing: -0.4,
          }}
        >
          {title}
        </span>
      </div>
      {/* Workspace scopes everything below it — a "brand / workspace" breadcrumb reads it as context. */}
      <WorkspaceSwitcher breadcrumb />
      {/* Trailing slash closes the brand+workspace context cluster off from the nav menu. */}
      <span style={{ color: "var(--ant-color-split)", fontSize: 18, fontWeight: 300, userSelect: "none" }}>/</span>
    </div>
  );
}

export default function MainLayout() {
  const navigate = useNavigate();
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

  return (
    <div id="pro-layout-wrapper" style={{ height: "100vh" }}>
      <ProLayout
        key={i18n.language}
        title={title}
        headerTitleRender={() => renderHeaderTitle(title, themePreset)}
        layout="mix"
        splitMenus
        fixedHeader
        token={appLayoutTokens[themePreset]}
        location={{ pathname: location.pathname }}
        route={filteredRoutes}
        menuItemRender={(item, dom) => (
          <a onClick={() => item.path && item.name !== "_jobs" && navigate(item.path)}>{dom}</a>
        )}
        actionsRender={() => [
          <ThemeSwitcher key="theme" />,
          <LangSwitcher key="lang" aria-hidden />,
          <UserAvatar key="avatar" />,
        ]}
        footerRender={
          isDashboard
            ? () => (
                <Typography.Text type="secondary" style={{ textAlign: "center" }}>
                  {t("app.footer", { year: new Date().getFullYear(), version: APP.version, appName: APP.name })}
                </Typography.Text>
              )
            : false
        }
        menuRender={isStudioPage ? false : undefined}
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
        </div>
      </ProLayout>
    </div>
  );
}
