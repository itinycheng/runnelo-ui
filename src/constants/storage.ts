/**
 * localStorage keys used across the app. Centralized so the request interceptor
 * and the stores that own each value can't drift apart (they used to hardcode
 * the same string literals in separate files).
 */
export const STORAGE_KEYS = {
  /** Session token sent through the legacy X-Token header. */
  token: "token",
  /** Serialized current user. */
  user: "user",
  /** Active workspace id — sent as X-Workspace-Id on every request. */
  workspaceId: "workspaceId",
  /** Active UI language (en | zh). */
  lang: "lang",
  /** Temporary visual-theme preset used while selecting the final design direction. */
  themePreset: "dtail.theme.preset",
  /** Recent query-console statements. */
  queryHistory: "dtail.query.history",
  /** Schema version of the persisted auth (token+user). Bump to invalidate stale sessions. */
  authVersion: "dtail.auth.version",
  /** Internal route restored after an external SSO round trip. */
  authReturnTo: "dtail.auth.returnTo",
} as const;
