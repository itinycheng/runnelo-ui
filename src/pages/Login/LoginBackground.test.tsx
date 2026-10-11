import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import LoginBackground from "./LoginBackground";

function setMedia({ mobile = false, reducedMotion = false } = {}) {
  window.matchMedia = (query: string) =>
    ({
      matches: query.includes("max-width") ? mobile : query.includes("prefers-reduced-motion") && reducedMotion,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}

describe("LoginBackground", () => {
  beforeEach(() => setMedia());

  it("shows one connected task dependency topology with a representative lifecycle", () => {
    const { getByTestId } = render(<LoginBackground />);
    const background = getByTestId("login-background");
    const desktop = background.querySelector('[data-layout="desktop"]');
    const states = [...(desktop?.querySelectorAll("[data-state]") ?? [])].map((node) =>
      node.getAttribute("data-state"),
    );
    const dependencies = desktop?.querySelectorAll('[data-edge="dependency"]') ?? [];

    expect(background).toHaveAttribute("aria-hidden", "true");
    expect(states).toEqual(["CREATED", "SUBMITTED", "WAITING", "RUNNING", "SUCCESS", "FAILURE", "KILLED"]);
    expect(dependencies.length).toBeGreaterThanOrEqual(5);
    expect(dependencies.length).toBeLessThanOrEqual(8);
    expect(background.querySelector('[data-task="aggregate_daily"]')).toHaveAttribute("data-expanded", "true");
    expect(background.querySelector('[data-task="aggregate_daily"] > rect')).toHaveAttribute("y", "70");
    expect(background.querySelector('[data-layout="mobile"]')).not.toBeInTheDocument();

    const connected = new Set(["aggregate_daily"]);
    const edges = [...dependencies].map(
      (edge) => [edge.getAttribute("data-from"), edge.getAttribute("data-to")] as const,
    );
    let changed = true;
    while (changed) {
      changed = false;
      edges.forEach(([from, to]) => {
        if (from && to && connected.has(from) && !connected.has(to)) {
          connected.add(to);
          changed = true;
        }
        if (from && to && connected.has(to) && !connected.has(from)) {
          connected.add(from);
          changed = true;
        }
      });
    }
    expect(connected).toEqual(
      new Set([
        "aggregate_daily",
        "extract_orders",
        "quality_gate",
        "publish_daily",
        "notify_owner",
        "archive_result",
        "emit_metrics",
      ]),
    );
  });

  it("renders the complete compact topology on mobile", () => {
    setMedia({ mobile: true });
    const { getByTestId } = render(<LoginBackground />);
    const background = getByTestId("login-background");
    const desktop = background.querySelector('[data-layout="desktop"]');
    const mobile = background.querySelector('[data-layout="mobile"]');

    expect(desktop).not.toBeInTheDocument();
    expect(mobile).toHaveAttribute("viewBox", "0 0 390 844");
    expect(mobile?.querySelectorAll("[data-state]")).toHaveLength(7);
    expect(mobile?.querySelectorAll("[data-task]").length).toBeGreaterThanOrEqual(4);
    const terminalTransitions = [...(mobile?.querySelectorAll("[data-transition-target]") ?? [])];
    expect(terminalTransitions.map((path) => path.getAttribute("data-transition-target"))).toEqual([
      "SUCCESS",
      "FAILURE",
      "KILLED",
    ]);
    expect(terminalTransitions.map((path) => path.getAttribute("d"))).toEqual([
      "M106 122 V132",
      "M196 122 V132",
      "M286 122 V132",
    ]);
  });

  it("uses SVG animation unless reduced motion is requested", () => {
    const { getByTestId, unmount } = render(<LoginBackground />);
    expect(getByTestId("login-background").querySelectorAll("animate").length).toBeGreaterThan(0);
    unmount();

    setMedia({ reducedMotion: true });
    const reduced = render(<LoginBackground />);
    expect(reduced.getByTestId("login-background").querySelectorAll("animate")).toHaveLength(0);
  });
});
