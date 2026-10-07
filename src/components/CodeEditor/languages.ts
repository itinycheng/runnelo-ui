export const CODE_EDITOR_LANGUAGES = ["sql", "shell", "python", "java", "plaintext"] as const;

export type CodeEditorLanguage = (typeof CODE_EDITOR_LANGUAGES)[number];

/**
 * Resolve backend task types without coupling the editor to the task enum.
 * Future task types can opt in by following the same descriptive naming, or
 * callers can pass `language` explicitly when a task name is ambiguous.
 */
export function languageForTaskType(taskType?: string): CodeEditorLanguage {
  const normalized = taskType?.trim().toUpperCase() ?? "";

  if (normalized.includes("PYTHON") || normalized.includes("PYSPARK")) return "python";
  if (normalized.includes("SHELL") || normalized.includes("BASH") || normalized.includes("ZSH")) return "shell";
  if (normalized.includes("SQL")) return "sql";
  if (normalized.includes("JAVA") || normalized.includes("JAR")) return "java";
  return "plaintext";
}

export function languageLabel(language: CodeEditorLanguage): string {
  return language === "plaintext" ? "TEXT" : language.toUpperCase();
}
