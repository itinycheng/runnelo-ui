import { createContext, useContext, useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { getEnvironmentIdentity, type EnvironmentIdentity } from "@/api/environment";
import "./styles.css";

type IdentityState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; identity: EnvironmentIdentity | null };

const EnvironmentIdentityContext = createContext<IdentityState>({ status: "loading" });

export function EnvironmentIdentityProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<IdentityState>({ status: "loading" });

  useEffect(() => {
    let active = true;
    void getEnvironmentIdentity()
      .then((identity) => {
        if (active) setState({ status: "ready", identity });
      })
      .catch(() => {
        if (active) setState({ status: "error" });
      });
    return () => {
      active = false;
    };
  }, []);

  return <EnvironmentIdentityContext.Provider value={state}>{children}</EnvironmentIdentityContext.Provider>;
}

function useEnvironmentIdentity() {
  return useContext(EnvironmentIdentityContext);
}

/** Fixed visual cue in the application header or above the login form. */
export function EnvironmentHeader() {
  const state = useEnvironmentIdentity();
  const { t } = useTranslation();
  if (state.status === "loading" || (state.status === "ready" && !state.identity?.header)) return null;

  const label = state.status === "error" ? t("environment.unknown") : state.identity!.label;
  const color = state.status === "error" ? "#64748B" : state.identity!.color;
  return (
    <span
      className="environment-header"
      data-testid="environment-header"
      style={{ "--environment-color": color } as CSSProperties}
    >
      <span className="environment-header__top-line" aria-hidden="true" />
      <span className="environment-header__label" title={label}>
        {label}
      </span>
    </span>
  );
}

/** Sparse, noninteractive text across the current workspace or login background. */
export function EnvironmentWatermark({ login = false }: { login?: boolean }) {
  const state = useEnvironmentIdentity();
  if (state.status !== "ready" || !state.identity?.watermark) return null;

  return (
    <div
      className={`environment-watermark${login ? " environment-watermark--login" : ""}`}
      data-testid="environment-watermark"
      aria-hidden="true"
      style={{ "--environment-color": state.identity.color } as CSSProperties}
    >
      <div className="environment-watermark__grid">
        {Array.from({ length: 42 }, (_, index) => (
          <span key={index}>{state.identity!.label}</span>
        ))}
      </div>
    </div>
  );
}
