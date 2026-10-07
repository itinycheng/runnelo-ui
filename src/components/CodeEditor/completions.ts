import type { CodeEditorLanguage } from "./languages";

export type CodeCompletionKind =
  | "keyword"
  | "function"
  | "snippet"
  | "variable"
  | "field"
  | "table"
  | "column"
  | "text";

export interface CodeCompletion {
  label: string;
  insertText?: string;
  detail?: string;
  documentation?: string;
  kind?: CodeCompletionKind;
  /** When true, Monaco expands `$1`, `${1:name}`, and `$0` placeholders. */
  snippet?: boolean;
  sortText?: string;
}

export interface CodeCompletionRequest {
  language: CodeEditorLanguage;
  taskType?: string;
  value: string;
  word: string;
  position: { lineNumber: number; column: number };
  /** Aborted when Monaco cancels an outdated completion request. */
  signal: AbortSignal;
}

/**
 * Extension point for contextual completions. A Query caller can later load
 * database/catalog metadata here without adding API knowledge to CodeEditor.
 * Providers should reuse cached metadata because Monaco may call them often.
 */
export type CodeCompletionProvider = (
  request: CodeCompletionRequest,
) => readonly CodeCompletion[] | Promise<readonly CodeCompletion[]>;

const keyword = (label: string): CodeCompletion => ({ label, kind: "keyword", detail: "Keyword" });
const fn = (label: string, insertText: string, detail = "Function"): CodeCompletion => ({
  label,
  insertText,
  kind: "function",
  detail,
  snippet: true,
});
const snippet = (label: string, insertText: string, detail: string): CodeCompletion => ({
  label,
  insertText,
  kind: "snippet",
  detail,
  snippet: true,
});

const SQL_COMPLETIONS: readonly CodeCompletion[] = [
  ...[
    "SELECT",
    "FROM",
    "WHERE",
    "JOIN",
    "LEFT JOIN",
    "GROUP BY",
    "ORDER BY",
    "HAVING",
    "LIMIT",
    "INSERT INTO",
    "UPDATE",
    "DELETE FROM",
    "CREATE TABLE",
    "ALTER TABLE",
    "WITH",
    "AS",
    "AND",
    "OR",
    "CASE",
    "WHEN",
    "THEN",
    "ELSE",
    "END",
  ].map(keyword),
  fn("COUNT", "COUNT(${1:*})"),
  fn("SUM", "SUM(${1:column})"),
  fn("AVG", "AVG(${1:column})"),
  fn("COALESCE", "COALESCE(${1:value}, ${2:fallback})"),
  snippet("SELECT … FROM", "SELECT ${1:*}\nFROM ${2:table}\nWHERE ${3:condition};", "Basic SELECT query"),
  snippet(
    "WITH … AS",
    "WITH ${1:cte} AS (\n  SELECT ${2:*}\n  FROM ${3:table}\n)\nSELECT *\nFROM ${1:cte};",
    "Common table expression",
  ),
];

const SHELL_COMPLETIONS: readonly CodeCompletion[] = [
  ...[
    "if",
    "then",
    "else",
    "elif",
    "fi",
    "for",
    "while",
    "do",
    "done",
    "case",
    "esac",
    "function",
    "export",
    "local",
    "readonly",
  ].map(keyword),
  fn("echo", "echo ${1:value}", "Shell built-in"),
  fn("printf", "printf '${1:%s\\n}' ${2:value}", "Shell built-in"),
  snippet("safe mode", "set -euo pipefail\n\n$0", "Fail fast and reject unset variables"),
  snippet("if block", "if ${1:condition}; then\n  ${2:echo ok}\nfi", "Conditional block"),
  snippet("for loop", 'for ${1:item} in ${2:items}; do\n  ${3:echo "$${1:item}"}\ndone', "For loop"),
];

const PYTHON_COMPLETIONS: readonly CodeCompletion[] = [
  ...[
    "and",
    "as",
    "assert",
    "async",
    "await",
    "break",
    "class",
    "continue",
    "def",
    "elif",
    "else",
    "except",
    "finally",
    "for",
    "from",
    "if",
    "import",
    "in",
    "is",
    "lambda",
    "None",
    "not",
    "or",
    "pass",
    "raise",
    "return",
    "True",
    "False",
    "try",
    "while",
    "with",
    "yield",
  ].map(keyword),
  fn("print", "print(${1:value})", "Python built-in"),
  fn("len", "len(${1:value})", "Python built-in"),
  fn("range", "range(${1:start}, ${2:stop})", "Python built-in"),
  snippet("function", "def ${1:name}(${2:args}):\n    ${3:pass}", "Function definition"),
  snippet(
    "main",
    'def main():\n    ${1:pass}\n\n\nif __name__ == "__main__":\n    main()',
    "Executable module entry point",
  ),
];

const JAVA_COMPLETIONS: readonly CodeCompletion[] = [
  ...[
    "public",
    "private",
    "protected",
    "class",
    "interface",
    "extends",
    "implements",
    "static",
    "final",
    "new",
    "return",
    "if",
    "else",
    "for",
    "while",
    "try",
    "catch",
    "finally",
    "throw",
    "throws",
    "null",
    "true",
    "false",
  ].map(keyword),
  fn("System.out.println", "System.out.println(${1:value});", "Print a line"),
  snippet("class", "public class ${1:ClassName} {\n    $0\n}", "Class declaration"),
  snippet("main", "public static void main(String[] args) {\n    $0\n}", "Application entry point"),
];

const BASIC_COMPLETIONS: Record<CodeEditorLanguage, readonly CodeCompletion[]> = {
  sql: SQL_COMPLETIONS,
  shell: SHELL_COMPLETIONS,
  python: PYTHON_COMPLETIONS,
  java: JAVA_COMPLETIONS,
  plaintext: [],
};

export function basicCompletionsFor(language: CodeEditorLanguage): readonly CodeCompletion[] {
  return BASIC_COMPLETIONS[language];
}

export function mergeCompletions(
  base: readonly CodeCompletion[],
  contextual: readonly CodeCompletion[],
): CodeCompletion[] {
  const merged = new Map<string, CodeCompletion>();
  for (const item of [...base, ...contextual]) merged.set(item.label.toLowerCase(), item);
  return [...merged.values()];
}
