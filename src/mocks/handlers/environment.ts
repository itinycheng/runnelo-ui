import { http, HttpResponse } from "msw";
import type { EnvironmentIdentity } from "@/api/environment";

function previewIdentity(): EnvironmentIdentity | null {
  const label = import.meta.env.VITE_MOCK_ENV_LABEL?.trim();
  const header = import.meta.env.VITE_MOCK_ENV_HEADER === "true";
  const watermark = import.meta.env.VITE_MOCK_ENV_WATERMARK === "true";
  if (!label || (!header && !watermark)) return null;

  const color = import.meta.env.VITE_MOCK_ENV_COLOR ?? "";
  return {
    label,
    color: /^#[0-9a-fA-F]{6}$/.test(color) ? color : "#475569",
    header,
    watermark,
  };
}

/** Local mock preview only; production reads the real backend at runtime. */
export const environmentHandlers = [http.get("/api/ui/environment", () => HttpResponse.json(previewIdentity()))];
