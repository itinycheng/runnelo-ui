import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import BrandLogo from ".";

describe("BrandLogo", () => {
  it("loads the adaptive SVG directly for Graphite", () => {
    render(<BrandLogo preset="graphite" />);

    const logo = screen.getByRole("img", { name: "Runnelo" });
    const image = logo.querySelector("img");
    expect(image).toHaveAttribute("src", "/runnelo-wordmark.svg?v=adaptive");
    expect(image).toHaveStyle({ mixBlendMode: "difference" });
  });

  it("keeps CSS-driven mask coloring for branded presets", () => {
    render(<BrandLogo preset="coral" />);

    const wordmark = screen.getByRole("img", { name: "Runnelo" }).firstElementChild as HTMLElement;
    expect(wordmark.tagName).toBe("SPAN");
    expect(wordmark.style.background).toBe("rgb(230, 82, 111)");
  });
});
