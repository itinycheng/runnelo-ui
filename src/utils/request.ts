import axios, { type AxiosError, type AxiosRequestConfig, type InternalAxiosRequestConfig } from "axios";
import i18n from "@/i18n";
import { API } from "@/config";
import { STORAGE_KEYS } from "@/constants/storage";
import { reportAppError } from "@/app/errorFeedback";

export const AUTH_EXPIRED_EVENT = "flink-platform:auth-expired";
const LEGACY_AUTH_ERROR_CODES = new Set([50008, 50012, 50014]);

function expireSession(): void {
  localStorage.removeItem(STORAGE_KEYS.token);
  localStorage.removeItem(STORAGE_KEYS.user);
  localStorage.removeItem(STORAGE_KEYS.workspaceId);
  window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
}

declare module "axios" {
  export interface AxiosRequestConfig {
    /** Skip the global error notification for this request (caller handles it inline). */
    suppressErrorToast?: boolean;
  }
}

const request = axios.create({
  baseURL: API.baseURL,
  timeout: API.timeout,
});

// Request interceptor: attach the headers understood by the deployed backend.
request.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem(STORAGE_KEYS.token);
    if (token) {
      config.headers["X-Token"] = token;
    }
    // Multi-tenant isolation: scope every request to the active workspace.
    const workspaceId = localStorage.getItem(STORAGE_KEYS.workspaceId);
    if (workspaceId) {
      config.headers["X-Workspace-Id"] = workspaceId;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  },
);

/** i18n key for each non-401 HTTP status with a dedicated message; falls back to "http.requestFailed". */
const HTTP_STATUS_MESSAGE_KEYS: Record<number, string> = {
  403: "http.forbidden",
  404: "http.notFound",
  500: "http.serverError",
};

function getHeader(headers: unknown, name: string): string | undefined {
  if (!headers || typeof headers !== "object") return undefined;
  const axiosHeaders = headers as { get?: (key: string) => unknown; [key: string]: unknown };
  const value = typeof axiosHeaders.get === "function" ? axiosHeaders.get(name) : axiosHeaders[name];
  return value == null ? undefined : String(value);
}

function requestKey(prefix: string, config?: AxiosRequestConfig, code?: number | string): string {
  if (prefix === "network" || prefix === "timeout") return prefix;
  return [prefix, code, config?.method?.toUpperCase(), config?.url].filter(Boolean).join(":");
}

function reportRequestError(
  config: AxiosRequestConfig | undefined,
  input: {
    keyPrefix: string;
    title: string;
    description: string;
    status?: number;
    code?: number | string;
    headers?: unknown;
    persistent?: boolean;
  },
): void {
  reportAppError({
    key: requestKey(input.keyPrefix, config, input.code ?? input.status),
    title: input.title,
    description: input.description,
    status: input.status,
    code: input.code,
    method: config?.method,
    url: config?.url,
    requestId: getHeader(input.headers, "x-request-id"),
    traceId: getHeader(input.headers, "x-trace-id") ?? getHeader(input.headers, "trace-id"),
    persistent: input.persistent,
  });
}

function httpErrorDescription(status: number): string {
  if (status === 403) return i18n.t("errorFeedback.forbiddenDescription");
  if (status === 404) return i18n.t("errorFeedback.notFoundDescription");
  if (status >= 500) return i18n.t("errorFeedback.serverDescription");
  return i18n.t("errorFeedback.requestDescription");
}

function isLoginLocation(): boolean {
  return window.location.pathname === "/login" || window.location.hash.startsWith("#/login");
}

// Response interceptor: unwrap the envelope + unified error messages
request.interceptors.response.use(
  (response) => {
    try {
      response.data = unwrapEnvelope(response.data);
      return response;
    } catch (err) {
      // Business error (code!==0). Notify here (a rejection from the success
      // handler bypasses this same interceptor's error handler), then propagate.
      const apiError = err as Error & { code?: number };
      if (apiError.code && LEGACY_AUTH_ERROR_CODES.has(apiError.code)) expireSession();
      if (!response.config?.suppressErrorToast) {
        reportRequestError(response.config, {
          keyPrefix: "business",
          title: i18n.t("errorFeedback.operationFailed"),
          description: apiError.message,
          code: apiError.code,
          headers: response.headers,
        });
      }
      return Promise.reject(err);
    }
  },
  (error: AxiosError) => {
    const suppressErrorToast = error.config?.suppressErrorToast;

    if (error.response) {
      const { status } = error.response;

      if (status === 401) {
        expireSession();
        if (!isLoginLocation()) {
          if (!suppressErrorToast) {
            reportRequestError(error.config, {
              keyPrefix: "auth-expired",
              title: i18n.t("http.authExpired"),
              description: i18n.t("errorFeedback.authExpiredDescription"),
              status,
              headers: error.response.headers,
              persistent: true,
            });
          }
        }
      } else if (!suppressErrorToast) {
        reportRequestError(error.config, {
          keyPrefix: "http",
          title: i18n.t(HTTP_STATUS_MESSAGE_KEYS[status] ?? "http.requestFailed", { status }),
          description: httpErrorDescription(status),
          status,
          headers: error.response.headers,
          persistent: status >= 500,
        });
      }
    } else if (!suppressErrorToast) {
      const timedOut = error.code === "ECONNABORTED";
      reportRequestError(error.config, {
        keyPrefix: timedOut ? "timeout" : "network",
        title: i18n.t(timedOut ? "http.timeout" : "http.networkError"),
        description: i18n.t(timedOut ? "errorFeedback.timeoutDescription" : "errorFeedback.networkDescription"),
        persistent: true,
      });
    }

    return Promise.reject(error);
  },
);

/**
 * Unwrap the backend response envelope `{ code, desc, data }`.
 *
 * Transitional shim: real-backend responses always carry the envelope, but
 * not-yet-migrated MSW mocks return plain bodies. A body is treated as an
 * envelope only when it has a numeric `code` and a `data` property; anything
 * else is returned untouched so legacy mocks keep working.
 */
export function unwrapEnvelope<T>(body: unknown): T {
  if (body !== null && typeof body === "object" && "code" in body && "data" in body) {
    const env = body as { code: number; desc?: string; data: T };
    if (typeof env.code === "number") {
      if (env.code !== 0) {
        throw Object.assign(new Error(env.desc || i18n.t("http.requestFailed", { status: env.code })), {
          code: env.code,
          isBusiness: true,
        });
      }
      return env.data;
    }
  }
  return body as T;
}

/**
 * Thin wrapper around axios that returns unwrapped response data.
 * The response interceptor already unwraps backend envelopes `{ code, desc, data }`
 * (and toasts business errors), while maintaining backward compatibility with
 * plain-body legacy MSW mocks. Use this in api/*.ts to avoid repeating `.then((r) => r.data)`.
 */
export const http = {
  get: <T>(url: string, config?: AxiosRequestConfig) => request.get<T>(url, config).then((r) => r.data as T),
  post: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    request.post<T>(url, data, config).then((r) => r.data as T),
  put: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    request.put<T>(url, data, config).then((r) => r.data as T),
  delete: <T = void>(url: string, config?: AxiosRequestConfig) =>
    request.delete<T>(url, config).then((r) => r.data as T),
};
