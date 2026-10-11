export interface AppErrorNotice {
  key: string;
  title: string;
  description: string;
  occurredAt?: string;
  status?: number;
  code?: number | string;
  requestId?: string;
  traceId?: string;
  method?: string;
  url?: string;
  persistent?: boolean;
  retry?: () => void | Promise<void>;
}

type ErrorFeedbackListener = (notice: Required<Pick<AppErrorNotice, "occurredAt">> & AppErrorNotice) => void;

const listeners = new Set<ErrorFeedbackListener>();

/**
 * Application-wide error channel used by non-React code such as the Axios
 * interceptor. The UI host decides how a notice is displayed and stacked.
 */
export function reportAppError(notice: AppErrorNotice): void {
  const normalized = { ...notice, occurredAt: notice.occurredAt ?? new Date().toISOString() };
  listeners.forEach((listener) => listener(normalized));
}

export function subscribeToAppErrors(listener: ErrorFeedbackListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
