import { describe, expect, it } from "vitest";
import { basicCompletionsFor, mergeCompletions } from "./completions";

describe("CodeEditor completions", () => {
  it("provides useful starter completions for supported languages", () => {
    expect(basicCompletionsFor("sql").some((item) => item.label === "SELECT … FROM")).toBe(true);
    expect(basicCompletionsFor("shell").some((item) => item.label === "safe mode")).toBe(true);
    expect(basicCompletionsFor("python").some((item) => item.label === "main")).toBe(true);
    expect(basicCompletionsFor("java").some((item) => item.label === "System.out.println")).toBe(true);
    expect(basicCompletionsFor("plaintext")).toEqual([]);
  });

  it("lets contextual completions replace matching built-ins", () => {
    const result = mergeCompletions(
      [{ label: "COUNT", detail: "Built in" }],
      [{ label: "count", detail: "Database function" }],
    );
    expect(result).toEqual([{ label: "count", detail: "Database function" }]);
  });
});
