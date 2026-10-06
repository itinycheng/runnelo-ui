import { Button, ConfigProvider, Dropdown, Flex, type MenuProps } from "antd";
import { GlobalOutlined, CheckOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { compactMenuTheme } from "@/theme";
import type { Lang } from "@/i18n";

const LANG_OPTIONS: { key: Lang; label: string }[] = [
  { key: "en", label: "English" },
  { key: "zh", label: "中文" },
];

export default function LangSwitcher() {
  const { i18n, t } = useTranslation();
  const lang: Lang = i18n.language === "zh" ? "zh" : "en";

  const items: MenuProps["items"] = LANG_OPTIONS.map((opt) => ({
    key: opt.key,
    label: (
      <Flex align="center" gap={8}>
        {opt.label}
        {lang === opt.key && <CheckOutlined />}
      </Flex>
    ),
  }));

  const handleClick: MenuProps["onClick"] = ({ key }) => {
    void i18n.changeLanguage(key);
  };

  return (
    <ConfigProvider theme={compactMenuTheme}>
      <Dropdown menu={{ items, onClick: handleClick, selectedKeys: [lang] }} trigger={["click"]}>
        <Button
          type="text"
          shape="circle"
          icon={<GlobalOutlined />}
          title={t("common.language")}
          aria-label={t("common.language")}
        />
      </Dropdown>
    </ConfigProvider>
  );
}
