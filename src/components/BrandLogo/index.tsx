import type { CSSProperties } from "react";
import { appPalettes, type ThemePresetKey } from "@/theme";

interface BrandLogoProps {
  preset: ThemePresetKey;
  height?: number;
  className?: string;
  style?: CSSProperties;
}

const WORDMARK_PATH = "/runnelo-wordmark.svg?v=adaptive";

function colorMask(path: string, color: string): CSSProperties {
  return {
    display: "block",
    flexShrink: 0,
    background: color,
    mask: `url(${path}) no-repeat center / contain`,
    WebkitMask: `url(${path}) no-repeat center / contain`,
  };
}

export default function BrandLogo({ preset, height = 28, className, style }: BrandLogoProps) {
  const palette = appPalettes[preset];
  const wordmarkWidth = Math.round(height * 3.75);
  const wordmark =
    preset === "graphite" ? (
      <img
        aria-hidden
        src={WORDMARK_PATH}
        width={wordmarkWidth}
        height={height}
        alt=""
        style={{ display: "block", flexShrink: 0, mixBlendMode: "difference" }}
      />
    ) : (
      <span
        aria-hidden
        style={{ ...colorMask(WORDMARK_PATH, palette.brand), width: wordmarkWidth, height }}
      />
    );

  return (
    <span
      className={className}
      role="img"
      aria-label="Runnelo"
      style={{ display: "inline-flex", alignItems: "center", ...style }}
    >
      {wordmark}
    </span>
  );
}
