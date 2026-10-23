import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./i18n";
import "@fontsource-variable/geist/wght.css";
import "./global.css";
import App from "./App";
import { APP, ENABLE_MOCK } from "./config";

async function bootstrap() {
  document.title = APP.name;

  // `import.meta.env.DEV` is statically replaced at build time, so production
  // builds tree-shake the MSW worker out entirely. ENABLE_MOCK then decides
  // whether to actually start it in dev (off when a real backend proxy is set).
  if (import.meta.env.DEV && ENABLE_MOCK) {
    const { worker } = await import("./mocks/browser");
    await worker.start({ onUnhandledRequest: "bypass" });
  }

  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

bootstrap().catch((err) => console.error("[bootstrap] failed", err));
