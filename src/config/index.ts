/**
 * Central runtime configuration.
 *
 * Per-environment values come from Vite env files (.env, .env.[mode], .env.local)
 * and are read through `import.meta.env` here — so there is one place to see
 * everything the app can be configured with, and consumers import typed values
 * instead of reaching into `import.meta.env` (or hardcoding literals) directly.
 */

/** Application metadata, injected at build time from package.json. */
export const APP = {
  name: __APP_NAME__,
  version: __APP_VERSION__,
} as const;

/** HTTP client configuration (see src/utils/request.ts). */
export const API = {
  /** Base URL prepended to every request. */
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "",
  /** Request timeout in milliseconds. */
  timeout: Number(import.meta.env.VITE_API_TIMEOUT) || 30_000,
} as const;

/**
 * How the app talks to its API:
 * - "mock"   — in-browser MSW mocks, no backend (development only)
 * - "proxy"  — dev server proxies VITE_API_BASE_URL to VITE_API_PROXY (real backend)
 * - "direct" — call VITE_API_BASE_URL directly (staging / production)
 */
export const API_MODE = import.meta.env.VITE_API_MODE || "mock";

/** Whether to start MSW request mocking (development only). Active only in "mock" mode. */
export const ENABLE_MOCK = API_MODE === "mock";

/** The development mock exposes definition folders; the legacy backend does not. */
export const USE_MOCK_DEFINITION_GROUPS = import.meta.env.DEV && ENABLE_MOCK;
