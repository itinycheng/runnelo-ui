import { describe, expect, it } from "vitest";
import {
  actionColor,
  enumColor,
  executionStatusTagColor,
  executionStatusVisualColor,
  statusColor,
} from "./statusColor";

describe("statusColor", () => {
  it.each([
    ["ENABLE", "green"],
    ["DISABLE", "default"],
    ["NORMAL", "green"],
    ["LOCKED", "red"],
    ["ACTIVE", "green"],
    ["INACTIVE", "default"],
    ["DELETED", "red"],
  ])("maps backend status %s to %s", (status, color) => {
    expect(statusColor(status)).toBe(color);
  });

  it("keeps execution tag and visual colors in the shared registry", () => {
    expect(executionStatusTagColor("RUNNING")).toBe("blue");
    expect(executionStatusVisualColor("RUNNING")).toBe("#1677FF");
  });

  it("returns stable category and audit-action colors", () => {
    expect(enumColor("MYSQL_SQL")).toBe(enumColor("MYSQL_SQL"));
    expect(actionColor("DELETE")).toBe("red");
    expect(actionColor("UNKNOWN")).toBe(enumColor("UNKNOWN"));
  });
});
