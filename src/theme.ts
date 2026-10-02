import type { ThemeConfig } from "antd";
import type { ProLayoutProps } from "@ant-design/pro-components";

export type ThemePresetKey = "coral" | "graphite" | "moss";

interface AppPalette {
  label: string;
  description: string;
  brand: string;
  accent: string;
  accentHover: string;
  accentActive: string;
  accentSoft: string;
  accentSoftHover: string;
  focusShadow: string;
  ink: string;
  inkSecondary: string;
  inkTertiary: string;
  inkQuaternary: string;
  border: string;
  borderSubtle: string;
  canvas: string;
  surface: string;
  surfaceSubtle: string;
  hover: string;
}

const neutral = {
  ink: "#18181B",
  inkSecondary: "#52525B",
  inkTertiary: "#71717A",
  inkQuaternary: "#A1A1AA",
  border: "#E4E4E7",
  borderSubtle: "#EFEFF1",
  canvas: "#F7F7F8",
  surface: "#FFFFFF",
  surfaceSubtle: "#FAFAFA",
  hover: "#F4F4F5",
} as const;

/** Three intentionally distinct review themes. Only one will survive selection. */
export const appPalettes: Record<ThemePresetKey, AppPalette> = {
  coral: {
    ...neutral,
    label: "Runnelo Coral",
    description: "Warm coral with a clear product signature",
    brand: "#E6526F",
    accent: "#C43F5B",
    accentHover: "#D64A67",
    accentActive: "#A9334D",
    accentSoft: "#FFF0F3",
    accentSoftHover: "#FFE1E8",
    focusShadow: "rgba(196, 63, 91, 0.14)",
  },
  graphite: {
    ...neutral,
    label: "Graphite Mono",
    description: "Nearly monochrome, quiet and tool-like",
    brand: "#27272A",
    accent: "#27272A",
    accentHover: "#3F3F46",
    accentActive: "#18181B",
    accentSoft: "#F4F4F5",
    accentSoftHover: "#E4E4E7",
    focusShadow: "rgba(39, 39, 42, 0.16)",
  },
  moss: {
    ...neutral,
    label: "Terminal Moss",
    description: "Muted terminal green with an industrial systems feel",
    brand: "#667C32",
    accent: "#52672C",
    accentHover: "#647B37",
    accentActive: "#3F501F",
    accentSoft: "#F2F6EA",
    accentSoftHover: "#E5EDD7",
    focusShadow: "rgba(82, 103, 44, 0.16)",
  },
};

export const THEME_PRESET_KEYS = Object.keys(appPalettes) as ThemePresetKey[];
export const DEFAULT_THEME_PRESET: ThemePresetKey = "coral";
export const APP_HEADER_HEIGHT = 46;

export function isThemePresetKey(value: string | null): value is ThemePresetKey {
  return value != null && THEME_PRESET_KEYS.includes(value as ThemePresetKey);
}

function createControlComponents(palette: AppPalette): NonNullable<ThemeConfig["components"]> {
  return {
    Button: {
      defaultShadow: "none",
      primaryShadow: "none",
      dangerShadow: "none",
      fontWeight: 500,
      defaultHoverBg: palette.surfaceSubtle,
      defaultHoverColor: palette.ink,
      defaultHoverBorderColor: palette.inkQuaternary,
      textHoverBg: palette.hover,
    },
    Card: {
      lineWidth: 1,
      headerHeight: 44,
      headerHeightSM: 38,
      headerFontSize: 14,
      headerFontSizeSM: 13,
      headerPadding: 16,
      headerPaddingSM: 12,
      bodyPadding: 16,
      bodyPaddingSM: 12,
    },
    Input: {
      activeBorderColor: palette.accent,
      hoverBorderColor: palette.inkQuaternary,
      activeShadow: `0 0 0 2px ${palette.focusShadow}`,
    },
    Select: {
      activeBorderColor: palette.accent,
      hoverBorderColor: palette.inkQuaternary,
      activeOutlineColor: palette.focusShadow,
      optionSelectedBg: palette.accentSoft,
      optionActiveBg: palette.hover,
    },
  };
}

function createNavigationComponents(palette: AppPalette): NonNullable<ThemeConfig["components"]> {
  return {
    Menu: {
      itemPaddingInline: 16,
      itemBorderRadius: 4,
      subMenuItemBorderRadius: 4,
      itemHoverBg: palette.hover,
      itemSelectedBg: palette.accentSoft,
      itemSelectedColor: palette.accentActive,
      horizontalItemHoverBg: palette.hover,
      horizontalItemSelectedBg: palette.hover,
      horizontalItemSelectedColor: palette.ink,
      activeBarBorderWidth: 0,
    },
    Tabs: {
      titleFontSize: 13,
      titleFontSizeSM: 13,
      inkBarColor: palette.accent,
      itemColor: palette.inkSecondary,
      itemHoverColor: palette.ink,
      itemActiveColor: palette.accentActive,
      itemSelectedColor: palette.accentActive,
    },
  };
}

function createDataComponents(palette: AppPalette): NonNullable<ThemeConfig["components"]> {
  return {
    Table: {
      cellPaddingBlock: 10,
      cellPaddingBlockMD: 9,
      cellPaddingBlockSM: 7,
      headerBg: palette.surfaceSubtle,
      headerColor: "#3F3F46",
      headerSplitColor: palette.border,
      headerBorderRadius: 6,
      borderColor: palette.borderSubtle,
      rowHoverBg: palette.hover,
      rowSelectedBg: palette.accentSoft,
      rowSelectedHoverBg: palette.accentSoftHover,
    },
    Tag: {
      defaultBg: palette.hover,
      defaultColor: palette.inkSecondary,
    },
    Tree: {
      colorBgContainer: "transparent",
      indentSize: 0,
      paddingXS: 0,
      marginXS: 0,
    },
  };
}

function createAppTheme(palette: AppPalette): ThemeConfig {
  return {
    cssVar: { prefix: "ant" },
    token: {
      colorPrimary: palette.accent,
      colorInfo: palette.accent,
      colorLink: palette.accentActive,
      colorText: palette.ink,
      colorIcon: palette.inkSecondary,
      colorTextSecondary: palette.inkSecondary,
      colorTextTertiary: palette.inkTertiary,
      colorTextQuaternary: palette.inkQuaternary,
      colorBorder: palette.border,
      colorBorderSecondary: palette.borderSubtle,
      colorBgLayout: palette.canvas,
      colorBgContainer: palette.surface,
      colorFillQuaternary: palette.hover,
      fontSize: 14,
      fontFamily:
        '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", Arial, sans-serif',
      fontFamilyCode: '"SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace',
      borderRadius: 6,
      borderRadiusSM: 4,
      borderRadiusLG: 8,
      controlHeight: 32,
      controlHeightSM: 28,
      motionDurationFast: "0.12s",
      motionDurationMid: "0.16s",
    },
    components: {
      ...createControlComponents(palette),
      ...createNavigationComponents(palette),
      ...createDataComponents(palette),
    },
  };
}

function createLayoutToken(palette: AppPalette): ProLayoutProps["token"] {
  return {
    header: {
      colorBgHeader: palette.surface,
      colorTextMenu: palette.inkSecondary,
      colorTextMenuSelected: palette.ink,
      colorBgMenuItemSelected: palette.hover,
      heightLayoutHeader: APP_HEADER_HEIGHT,
    },
    sider: {
      colorMenuBackground: palette.surface,
      colorMenuItemDivider: palette.borderSubtle,
      colorTextMenu: palette.inkSecondary,
      colorTextMenuSelected: palette.accentActive,
      colorBgMenuItemSelected: palette.accentSoft,
      paddingInlineLayoutMenu: 6,
      paddingBlockLayoutMenu: 6,
    },
    pageContainer: {
      paddingBlockPageContainerContent: 0,
      paddingInlinePageContainerContent: 0,
    },
  };
}

export const appThemes = Object.fromEntries(
  THEME_PRESET_KEYS.map((key) => [key, createAppTheme(appPalettes[key])]),
) as Record<ThemePresetKey, ThemeConfig>;

export const appLayoutTokens = Object.fromEntries(
  THEME_PRESET_KEYS.map((key) => [key, createLayoutToken(appPalettes[key])]),
) as Record<ThemePresetKey, ProLayoutProps["token"]>;

/** Compact popup menu rows — for dropdown / context menus (keeps nav/sidebar menus at default). */
export const compactMenuTheme: ThemeConfig = {
  cssVar: { prefix: "ant" },
  components: { Menu: { itemHeight: 30, itemMarginBlock: 2 } },
};
