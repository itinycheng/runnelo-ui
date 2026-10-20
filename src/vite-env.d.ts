/// <reference types="vite/client" />

declare const __APP_NAME__: string;
declare const __APP_VERSION__: string;

interface ImportMetaEnv {
  /** Base URL prepended to every API request. */
  readonly VITE_API_BASE_URL: string;
  /** HTTP request timeout in milliseconds (parsed as a number). */
  readonly VITE_API_TIMEOUT: string;
  /** How the app talks to its API: MSW mocks / dev proxy / direct calls. */
  readonly VITE_API_MODE: "mock" | "proxy" | "direct";
  /** Backend origin to proxy API calls to when VITE_API_MODE=proxy (dev only). */
  readonly VITE_API_PROXY: string;
  /** Local mock preview only; not read by production builds. */
  readonly VITE_MOCK_ENV_LABEL?: string;
  readonly VITE_MOCK_ENV_COLOR?: string;
  readonly VITE_MOCK_ENV_HEADER?: string;
  readonly VITE_MOCK_ENV_WATERMARK?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
