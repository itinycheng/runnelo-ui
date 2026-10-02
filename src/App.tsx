import { useEffect } from "react";
import { ConfigProvider, App as AntApp } from "antd";
import enUS from "antd/locale/en_US";
import zhCN from "antd/locale/zh_CN";
import { useTranslation } from "react-i18next";
import { ProConfigProvider, enUSIntl, zhCNIntl } from "@ant-design/pro-components";
import AppRouter from "./router";
import { AUTH_EXPIRED_EVENT } from "@/utils/request";
import { useAuthStore } from "@/stores/authStore";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/app/queryClient";
import { AppErrorBoundary } from "@/app/AppErrorBoundary";
import { appPalettes, appThemes } from "@/theme";
import { useThemeStore } from "@/stores/themeStore";

const antLocales = { en: enUS, zh: zhCN };
const proIntls = { en: enUSIntl, zh: zhCNIntl };

function App() {
  const { i18n } = useTranslation();
  const lang: "en" | "zh" = i18n.language === "zh" ? "zh" : "en";
  const themePreset = useThemeStore((state) => state.preset);

  useEffect(() => {
    const onAuthExpired = () => {
      useAuthStore.setState({ token: null, user: null, isAuthenticated: false });
      useWorkspaceStore.setState({ currentId: null, workspaces: [], loaded: false });
      queryClient.clear();
    };
    window.addEventListener(AUTH_EXPIRED_EVENT, onAuthExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onAuthExpired);
  }, []);

  useEffect(() => {
    const favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    const palette = appPalettes[themePreset];
    const controller = new AbortController();

    void fetch("/runnelo-mark.svg", { signal: controller.signal })
      .then((response) => response.text())
      .then((source) => {
        if (!favicon) return;
        const themedMark = source.replaceAll("#E6526F", palette.brand);
        favicon.href = `data:image/svg+xml,${encodeURIComponent(themedMark)}`;
      })
      .catch(() => {
        // Keep the default Coral favicon when the static asset cannot be loaded.
      });

    return () => controller.abort();
  }, [themePreset]);

  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider locale={antLocales[lang]} theme={appThemes[themePreset]}>
        <ProConfigProvider intl={proIntls[lang]}>
          <AntApp>
            <AppErrorBoundary>
              <AppRouter />
            </AppErrorBoundary>
          </AntApp>
        </ProConfigProvider>
      </ConfigProvider>
    </QueryClientProvider>
  );
}

export default App;
