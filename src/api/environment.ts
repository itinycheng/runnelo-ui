import { http } from "@/utils/request";

export interface EnvironmentIdentity {
  label: string;
  color: string;
  header: boolean;
  watermark: boolean;
}

/** Public runtime identity of the backend serving this UI. */
export function getEnvironmentIdentity(): Promise<EnvironmentIdentity | null> {
  return http.get<EnvironmentIdentity | null>("/ui/environment", { suppressErrorToast: true });
}
