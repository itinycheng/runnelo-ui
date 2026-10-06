import { Button, ConfigProvider, Dropdown, Flex, Typography, type MenuProps } from "antd";
import { BgColorsOutlined, CheckOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { appPalettes, compactMenuTheme, THEME_PRESET_KEYS, type ThemePresetKey } from "@/theme";
import { useThemeStore } from "@/stores/themeStore";

export default function ThemeSwitcher() {
  const { t } = useTranslation();
  const preset = useThemeStore((state) => state.preset);
  const setPreset = useThemeStore((state) => state.setPreset);

  const items: MenuProps["items"] = THEME_PRESET_KEYS.map((key) => {
    const palette = appPalettes[key];
    return {
      key,
      label: (
        <Flex align="center" gap={8} style={{ minWidth: 180 }}>
          <span
            aria-hidden
            style={{
              width: 10,
              height: 10,
              borderRadius: 3,
              background: palette.brand,
              flexShrink: 0,
            }}
          />
          <Flex vertical style={{ flex: 1 }}>
            <Typography.Text>{palette.label}</Typography.Text>
            <Typography.Text type="secondary" style={{ fontSize: 11 }}>
              {palette.description}
            </Typography.Text>
          </Flex>
          {preset === key && <CheckOutlined />}
        </Flex>
      ),
    };
  });

  const handleClick: MenuProps["onClick"] = ({ key }) => setPreset(key as ThemePresetKey);

  return (
    <ConfigProvider theme={compactMenuTheme}>
      <Dropdown
        menu={{ items, onClick: handleClick, selectedKeys: [preset] }}
        trigger={["click"]}
        placement="bottomRight"
      >
        <Button
          type="text"
          shape="circle"
          icon={<BgColorsOutlined />}
          title={t("theme.switchTheme")}
          aria-label={t("theme.switchTheme")}
        />
      </Dropdown>
    </ConfigProvider>
  );
}
