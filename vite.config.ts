import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import pkg from "./package.json";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, import.meta.dirname, "");
  const apiBase = env.VITE_API_BASE_URL || "/api";
  // Only proxy when explicitly in "proxy" mode and a target is given.
  const proxyTarget = env.VITE_API_MODE === "proxy" ? env.VITE_API_PROXY : "";

  return {
    define: {
      __APP_NAME__: JSON.stringify(pkg.appTitle ?? pkg.name),
      __APP_VERSION__: JSON.stringify(pkg.version),
    },
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "./src"),
      },
    },
    // In "proxy" mode, forward API calls to a real backend in dev (mocks are off — see src/config).
    server: proxyTarget
      ? {
          proxy: {
            // Strip the development-only API prefix when forwarding requests.
            // Revisit this mapping against the new backend contract.
            [apiBase]: {
              target: proxyTarget,
              changeOrigin: true,
              rewrite: (requestPath) => requestPath.slice(apiBase.length) || "/",
            },
          },
        }
      : undefined,
  };
});
