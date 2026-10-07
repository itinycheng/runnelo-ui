import { describe, expect, it } from "vitest";
import { languageForTaskType, languageLabel } from "./languages";

describe("CodeEditor language mapping", () => {
  it.each([
    ["FLINK_SQL", "sql"],
    ["MYSQL_SQL", "sql"],
    ["SHELL", "shell"],
    ["BASH_SCRIPT", "shell"],
    ["PYTHON", "python"],
    ["PYSPARK", "python"],
    ["PYSPARK_SQL", "python"],
    ["FLINK_JAR", "java"],
    ["COMMON_JAR", "java"],
    ["UNKNOWN", "plaintext"],
  ] as const)("maps %s to %s", (taskType, language) => {
    expect(languageForTaskType(taskType)).toBe(language);
  });

  it("formats compact language labels", () => {
    expect(languageLabel("sql")).toBe("SQL");
    expect(languageLabel("plaintext")).toBe("TEXT");
  });
});
