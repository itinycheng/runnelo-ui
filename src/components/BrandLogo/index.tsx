import type { CSSProperties } from "react";
import { appPalettes, type ThemePresetKey } from "@/theme";

interface BrandLogoProps {
  preset: ThemePresetKey;
  height?: number;
  className?: string;
}

function colorMask(path: string, color: string): CSSProperties {
  return {
    display: "block",
    flexShrink: 0,
    background: color,
    mask: `url(${path}) no-repeat center / contain`,
    WebkitMask: `url(${path}) no-repeat center / contain`,
  };
}

export default function BrandLogo({ preset, height = 28, className }: BrandLogoProps) {
  const palette = appPalettes[preset];
  const wordmarkWidth = Math.round(height * 3.75);

  return (
    <span
      className={className}
      role="img"
      aria-label="Runnelo"
      style={{ display: "inline-flex", alignItems: "center" }}
    >
      <span
        aria-hidden
        style={{ ...colorMask("/runnelo-wordmark.svg", palette.brand), width: wordmarkWidth, height }}
      />
    </span>
  );
}
