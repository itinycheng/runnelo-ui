import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Card, Flex, Form, Input, Button, Typography, message, Spin } from "antd";
import { LockOutlined, UserOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@/stores/authStore";
import { getLoginConfig } from "@/api/auth";
import { STORAGE_KEYS } from "@/constants/storage";
import BrandLogo from "@/components/BrandLogo";
import { useThemeStore } from "@/stores/themeStore";
import { addReauthentication, readSsoCallback, safeReturnTo } from "./sso";

interface LoginFormValues {
  username: string;
  password: string;
}

/** LOCAL (password) login form with demo-credential prefill + hint. */
function LocalLoginForm({
  form,
  onFinish,
  loading,
}: {
  form: ReturnType<typeof Form.useForm<LoginFormValues>>[0];
  onFinish: (values: LoginFormValues) => void;
  loading: boolean;
}) {
  const { t } = useTranslation();
  return (
    <Form<LoginFormValues>
      form={form}
      onFinish={onFinish}
      autoComplete="off"
      size="large"
      initialValues={{ username: "admin", password: "111111" }}
    >
      <Form.Item name="username" rules={[{ required: true, message: t("login.usernameRequired") }]}>
        <Input prefix={<UserOutlined />} placeholder={t("login.username")} data-testid="username-input" />
      </Form.Item>
      <Form.Item name="password" rules={[{ required: true, message: t("login.passwordRequired") }]}>
        <Input.Password prefix={<LockOutlined />} placeholder={t("login.password")} data-testid="password-input" />
      </Form.Item>
      <Form.Item>
        <Button type="primary" htmlType="submit" loading={loading} block data-testid="login-button">
          {t("login.loginButton")}
        </Button>
      </Form.Item>
      <Typography.Text type="secondary" style={{ display: "block", textAlign: "center", fontSize: 12 }}>
        {t("login.demoHint")}
      </Typography.Text>
    </Form>
  );
}

/** SSO (CAS/OIDC) redirect panel. */
function SsoLoginPanel({ ssoLoginUrl, onRedirect }: { ssoLoginUrl: string; onRedirect: () => void }) {
  const { t } = useTranslation();
  return (
    <Flex vertical gap={16} align="center" style={{ padding: "24px 0" }}>
      <Typography.Text type="secondary">{t("login.ssoRedirectHint")}</Typography.Text>
      <Button
        type="primary"
        size="large"
        block
        href={ssoLoginUrl || undefined}
        onClick={onRedirect}
        data-testid="sso-login-button"
      >
        {t("login.ssoLogin")}
      </Button>
    </Flex>
  );
}

function useLoginBootstrap() {
  const [callback] = useState(() => readSsoCallback(window.location.search));
  const [loading, setLoading] = useState(callback != null);
  const [configLoading, setConfigLoading] = useState(callback == null);
  const [authType, setAuthType] = useState("LOCAL");
  const [ssoLoginUrl, setSsoLoginUrl] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const [routeSearchParams] = useSearchParams();
  const login = useAuthStore((state) => state.login);
  const loginSso = useAuthStore((state) => state.loginSso);
  const callbackStarted = useRef(false);
  const ssoFailed = routeSearchParams.get("ssoFailed") === "1";
  const from = (location.state as { from?: { pathname?: string; search?: string } } | null)?.from;
  const returnTo = safeReturnTo(`${from?.pathname ?? ""}${from?.search ?? ""}`);

  useEffect(() => {
    if (callback && !callbackStarted.current) {
      callbackStarted.current = true;
      window.history.replaceState(null, "", window.location.pathname + window.location.hash);
      void loginSso(callback)
        .then(() => {
          const returnTo = safeReturnTo(sessionStorage.getItem(STORAGE_KEYS.authReturnTo));
          sessionStorage.removeItem(STORAGE_KEYS.authReturnTo);
          void navigate(returnTo, { replace: true });
        })
        .catch(() => void navigate("/login?ssoFailed=1", { replace: true }))
        .finally(() => setLoading(false));
      return;
    }
    let mounted = true;
    getLoginConfig()
      .then((config) => {
        if (!mounted) return;
        setAuthType(config.authType);
        setSsoLoginUrl(addReauthentication(config.ssoLoginUrl ?? "", config.authType, ssoFailed));
      })
      .catch(() => {
        // Endpoint unreachable — fall back to the LOCAL password form.
      })
      .finally(() => {
        if (mounted) setConfigLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [callback, loginSso, navigate, ssoFailed]);

  return { loading, setLoading, configLoading, authType, ssoLoginUrl, login, navigate, returnTo };
}

export default function Login() {
  const [form] = Form.useForm<LoginFormValues>();
  const { t } = useTranslation();
  const themePreset = useThemeStore((state) => state.preset);
  const { loading, setLoading, configLoading, authType, ssoLoginUrl, login, navigate, returnTo } = useLoginBootstrap();

  const rememberReturnTo = () => {
    sessionStorage.setItem(STORAGE_KEYS.authReturnTo, returnTo);
  };

  const handleSubmit = async (values: LoginFormValues) => {
    setLoading(true);
    try {
      await login(values.username, values.password);
      message.success(t("login.loginSuccess"));
      await navigate(returnTo, { replace: true });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : t("login.loginFailed");
      message.error(errorMessage);
      form.setFieldsValue({ password: "" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Flex justify="center" align="center" style={{ minHeight: "100vh" }}>
      <Card style={{ width: 400 }}>
        <BrandLogo
          preset={themePreset}
          height={38}
          style={{ display: "flex", justifyContent: "center", margin: "0 auto 24px" }}
        />
        {configLoading ? (
          <Flex justify="center" style={{ padding: 24 }}>
            <Spin data-testid="login-config-loading" />
          </Flex>
        ) : authType === "LOCAL" ? (
          <LocalLoginForm form={form} onFinish={handleSubmit} loading={loading} />
        ) : (
          <SsoLoginPanel ssoLoginUrl={ssoLoginUrl} onRedirect={rememberReturnTo} />
        )}
      </Card>
    </Flex>
  );
}
