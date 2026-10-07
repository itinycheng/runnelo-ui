import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ForwardedRef,
  type MutableRefObject,
} from "react";
import Editor, { type Monaco, type OnMount } from "@monaco-editor/react";
import type { editor, IRange, languages } from "monaco-editor";
import "@/lib/monaco/setup";
import {
  basicCompletionsFor,
  mergeCompletions,
  type CodeCompletion,
  type CodeCompletionKind,
  type CodeCompletionProvider,
} from "./completions";
import { languageForTaskType, languageLabel, type CodeEditorLanguage } from "./languages";
import "./CodeEditor.css";

export type { CodeCompletion, CodeCompletionProvider, CodeCompletionRequest } from "./completions";
export type { CodeEditorLanguage } from "./languages";

export interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  /** Explicit language wins over automatic task-type detection. */
  language?: CodeEditorLanguage;
  /** Backend task type, e.g. MYSQL_SQL, SHELL, PYTHON, or FLINK_JAR. */
  taskType?: string;
  /** Minimum editor height in px. Default 120. */
  minHeight?: number;
  /**
   * Maximum editor height in px. When omitted, defaults to a viewport-based
   * value (recomputed on window resize) so the editor can grow to nearly fill
   * the screen before scrolling internally.
   */
  maxHeight?: number;
  readOnly?: boolean;
  /** Overlay text shown when the editor is empty (Monaco has no native placeholder). */
  placeholder?: string;
  /** Invoked when the user presses Cmd/Ctrl+Enter inside the editor. */
  onRun?: () => void;
  /** Adds suggestions from a caller-owned source such as database metadata. */
  completionProvider?: CodeCompletionProvider;
  /** Include the built-in language keywords and starter snippets. Default true. */
  basicCompletions?: boolean;
  /** Show the compact language/shortcut bar below the editor. Default true. */
  showStatusBar?: boolean;
  /** Per-use overrides layered on top of the shared editor defaults. */
  options?: editor.IStandaloneEditorConstructionOptions;
  ariaLabel?: string;
}

/** Imperative handle exposed to parents for reading/mutating editor content. */
export interface CodeEditorHandle {
  /** Text currently selected in the editor, or "" when nothing is selected. */
  getSelectedText: () => string;
  /** Insert text at the cursor (replacing any selection) and refocus the editor. */
  insertText: (text: string) => void;
}

/** Leave room for form chrome (labels, drawer padding, buttons) below the editor. */
const VIEWPORT_OFFSET = 220;
const VIEWPORT_MIN = 240;

function viewportMaxHeight(): number {
  return Math.max(VIEWPORT_MIN, window.innerHeight - VIEWPORT_OFFSET);
}

/**
 * Auto-grow the editor with its content, clamped to [minHeight, maxHeight].
 * When `maxHeight` is omitted, tracks a viewport-based max (updated on resize).
 * Returns the current height and a `notifyContentHeight` callback to feed
 * Monaco's content height into the clamp.
 */
function useAutoGrowHeight(minHeight: number, maxHeight?: number) {
  const [height, setHeight] = useState(minHeight);
  const [viewportMax, setViewportMax] = useState(viewportMaxHeight);
  const maxPx = maxHeight ?? viewportMax;

  useEffect(() => {
    if (maxHeight != null) return;
    const onResize = () => setViewportMax(viewportMaxHeight());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [maxHeight]);

  const notifyContentHeight = useCallback(
    (contentHeight: number) => setHeight(Math.min(Math.max(contentHeight, minHeight), maxPx)),
    [minHeight, maxPx],
  );

  return { height, notifyContentHeight };
}

/** Text currently selected in the editor, or "" when there's no selection. */
function readSelection(ed: editor.IStandaloneCodeEditor | null): string {
  const selection = ed?.getSelection();
  if (!ed || !selection) return "";
  return ed.getModel()?.getValueInRange(selection) ?? "";
}

/** Insert text at the cursor (replacing any selection) and refocus the editor. */
function insertAtCursor(ed: editor.IStandaloneCodeEditor | null, text: string): void {
  const selection = ed?.getSelection();
  if (!ed || !selection) return;
  ed.executeEdits("insert-token", [{ range: selection, text, forceMoveMarkers: true }]);
  ed.focus();
}

const EDITOR_OPTIONS: editor.IStandaloneEditorConstructionOptions = {
  minimap: { enabled: false },
  scrollBeyondLastLine: false,
  automaticLayout: true,
  tabSize: 2,
  fontSize: 13,
  lineHeight: 20,
  lineNumbers: "on",
  lineNumbersMinChars: 3,
  quickSuggestions: true,
  suggest: { preview: true, showStatusBar: true },
  tabCompletion: "on",
  parameterHints: { enabled: true },
  bracketPairColorization: { enabled: true },
  guides: { bracketPairs: true, indentation: true },
  padding: { top: 8, bottom: 8 },
  renderLineHighlight: "line",
  renderWhitespace: "selection",
  smoothScrolling: true,
  fixedOverflowWidgets: true,
  // Don't let commit characters (notably space) auto-accept the highlighted
  // suggestion — that duplicates the word and swallows the space. Tab/Enter
  // still accept.
  acceptSuggestionOnCommitCharacter: false,
  wordWrap: "on",
  scrollbar: { alwaysConsumeMouseWheel: false },
  overviewRulerLanes: 0,
};

function completionKind(monaco: Monaco, kind: CodeCompletionKind | undefined): languages.CompletionItemKind {
  switch (kind) {
    case "function":
      return monaco.languages.CompletionItemKind.Function;
    case "snippet":
      return monaco.languages.CompletionItemKind.Snippet;
    case "variable":
      return monaco.languages.CompletionItemKind.Variable;
    case "field":
    case "column":
      return monaco.languages.CompletionItemKind.Field;
    case "table":
      return monaco.languages.CompletionItemKind.Struct;
    case "text":
      return monaco.languages.CompletionItemKind.Text;
    case "keyword":
    default:
      return monaco.languages.CompletionItemKind.Keyword;
  }
}

function toMonacoCompletion(monaco: Monaco, item: CodeCompletion, range: IRange): languages.CompletionItem {
  return {
    label: item.label,
    insertText: item.insertText ?? item.label,
    detail: item.detail,
    documentation: item.documentation,
    kind: completionKind(monaco, item.kind),
    range,
    sortText: item.sortText,
    insertTextRules: item.snippet ? monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet : undefined,
  };
}

function useLatestRef<T>(value: T): MutableRefObject<T> {
  const ref = useRef(value);
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref;
}

interface CompletionRefs {
  provider: MutableRefObject<CodeCompletionProvider | undefined>;
  basic: MutableRefObject<boolean>;
  taskType: MutableRefObject<string | undefined>;
}

function createCompletionProvider(
  monaco: Monaco,
  targetModel: editor.ITextModel,
  language: CodeEditorLanguage,
  refs: CompletionRefs,
): languages.CompletionItemProvider {
  return {
    triggerCharacters: ["."],
    async provideCompletionItems(model, position, _context, token) {
      if (model !== targetModel) return { suggestions: [] };

      const word = model.getWordUntilPosition(position);
      const range: IRange = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };
      const base = refs.basic.current ? basicCompletionsFor(language) : [];
      let contextual: readonly CodeCompletion[] = [];
      const abortController = new AbortController();
      const cancellation = token.onCancellationRequested(() => abortController.abort());
      try {
        contextual = refs.provider.current
          ? await refs.provider.current({
              language,
              taskType: refs.taskType.current,
              value: model.getValue(),
              word: word.word,
              position: { lineNumber: position.lineNumber, column: position.column },
              signal: abortController.signal,
            })
          : [];
      } catch {
        // Remote/contextual suggestions are optional; preserve local hints.
      } finally {
        cancellation.dispose();
      }

      if (token.isCancellationRequested) return { suggestions: [] };
      return { suggestions: mergeCompletions(base, contextual).map((item) => toMonacoCompletion(monaco, item, range)) };
    },
  };
}

interface CompletionRegistrationOptions {
  editorRef: MutableRefObject<editor.IStandaloneCodeEditor | null>;
  monacoRef: MutableRefObject<Monaco | null>;
  editorReady: boolean;
  language: CodeEditorLanguage;
  refs: CompletionRefs;
}

function useCompletionRegistration({
  editorRef,
  monacoRef,
  editorReady,
  language,
  refs,
}: CompletionRegistrationOptions) {
  useEffect(() => {
    const monaco = monacoRef.current;
    const targetModel = editorRef.current?.getModel();
    if (!editorReady || !monaco || !targetModel || language === "plaintext") return;
    const disposable = monaco.languages.registerCompletionItemProvider(
      language,
      createCompletionProvider(monaco, targetModel, language, refs),
    );
    return () => disposable.dispose();
  }, [editorReady, editorRef, language, monacoRef, refs]);
}

function useCodeEditorHandle(
  ref: ForwardedRef<CodeEditorHandle>,
  editorRef: MutableRefObject<editor.IStandaloneCodeEditor | null>,
) {
  useImperativeHandle(ref, () => ({
    getSelectedText: () => readSelection(editorRef.current),
    insertText: (text) => insertAtCursor(editorRef.current, text),
  }));
}

function useEditorHeightSync(
  editorRef: MutableRefObject<editor.IStandaloneCodeEditor | null>,
  notifyContentHeight: (height: number) => void,
) {
  useEffect(() => {
    const ed = editorRef.current;
    if (ed) notifyContentHeight(ed.getContentHeight());
  }, [editorRef, notifyContentHeight]);
}

/**
 * Monaco-backed code editor that auto-grows with its content between
 * `minHeight` and `maxHeight`, then scrolls internally once content exceeds
 * the max. Matches the app's light Ant Design theme.
 */
const CodeEditor = forwardRef<CodeEditorHandle, CodeEditorProps>(function CodeEditor(
  {
    value,
    onChange,
    language,
    taskType,
    minHeight = 120,
    maxHeight,
    readOnly = false,
    placeholder,
    onRun,
    completionProvider,
    basicCompletions = true,
    showStatusBar = true,
    options,
    ariaLabel,
  },
  ref,
) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const completionProviderRef = useLatestRef(completionProvider);
  const basicCompletionsRef = useLatestRef(basicCompletions);
  const taskTypeRef = useLatestRef(taskType);
  const completionRefs = useMemo(
    () => ({ provider: completionProviderRef, basic: basicCompletionsRef, taskType: taskTypeRef }),
    [completionProviderRef, basicCompletionsRef, taskTypeRef],
  );
  const [editorReady, setEditorReady] = useState(false);
  const resolvedLanguage = useMemo(() => language ?? languageForTaskType(taskType), [language, taskType]);
  // Keep the latest onRun in a ref so the Monaco keybinding (registered once on
  // mount) always calls the current handler without re-registering.
  const onRunRef = useLatestRef(onRun);
  // Guards the onChange handler while we push an *external* value via setValue —
  // Monaco fires onDidChangeModelContent synchronously from setValue, and
  // without this we'd echo the imported value straight back to the parent.
  const suppressChangeRef = useRef(false);
  const { height, notifyContentHeight } = useAutoGrowHeight(minHeight, maxHeight);

  useCodeEditorHandle(ref, editorRef);
  useEditorHeightSync(editorRef, notifyContentHeight);
  useCompletionRegistration({ editorRef, monacoRef, editorReady, language: resolvedLanguage, refs: completionRefs });

  const handleMount: OnMount = (ed, monaco) => {
    editorRef.current = ed;
    monacoRef.current = monaco;
    setEditorReady(true);
    notifyContentHeight(ed.getContentHeight());
    ed.onDidContentSizeChange(() => notifyContentHeight(ed.getContentHeight()));
    ed.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => onRunRef.current?.());
  };

  // Sync *external* value changes (e.g. switching tasks) into the model, but
  // never while the user is typing — echoing our own `onChange` back into a
  // controlled `value` prop races with rapid keystrokes and scrambles input.
  // The editor is the source of truth while focused.
  useEffect(() => {
    const ed = editorRef.current;
    if (!ed || ed.hasTextFocus()) return;
    if (value !== ed.getValue()) {
      suppressChangeRef.current = true;
      ed.setValue(value);
      suppressChangeRef.current = false;
    }
  }, [value]);

  const handleChange = (v: string | undefined) => {
    if (suppressChangeRef.current) return;
    onChange(v ?? "");
  };

  return (
    <div className="code-editor">
      <Editor
        height={height}
        language={resolvedLanguage}
        theme="vs"
        defaultValue={value}
        onChange={handleChange}
        onMount={handleMount}
        options={{ ...EDITOR_OPTIONS, ...options, readOnly, ariaLabel }}
      />
      {!value && placeholder ? <div className="code-editor__placeholder">{placeholder}</div> : null}
      {showStatusBar ? (
        <div className="code-editor__status" aria-hidden="true">
          <span className="code-editor__language">{languageLabel(resolvedLanguage)}</span>
          {!readOnly && (onRun ? <span>Ctrl/⌘ Enter</span> : <span>Ctrl/⌘ Space</span>)}
        </div>
      ) : null}
    </div>
  );
});

export default CodeEditor;
