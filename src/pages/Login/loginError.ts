import { isAxiosError } from "axios";

export function localLoginErrorMessage(error: unknown, fallback: string): string | null {
  if (!isAxiosError(error)) return error instanceof Error ? error.message : fallback;
  if (error.response?.status !== 401) return null;
  const body = error.response.data as { message?: string; desc?: string } | undefined;
  return body?.message ?? body?.desc ?? fallback;
}
