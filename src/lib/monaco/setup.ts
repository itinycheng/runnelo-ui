/**
 * Local (self-hosted) Monaco bootstrap.
 *
 * Registers the bundled `monaco-editor` package with `@monaco-editor/react`'s
 * loader so nothing is fetched from a CDN at runtime, and points
 * `MonacoEnvironment` at the base editor worker bundled by Vite.
 *
 * The supported basic languages only need the base editor worker — no
 * TS/JSON/CSS/HTML language workers.
 *
 * Imported once for its side effects by the shared CodeEditor component.
 */
import * as monaco from "monaco-editor/editor/editor.api";
import "monaco-editor/editor/contrib/snippet/browser/snippetController2";
import "monaco-editor/editor/contrib/suggest/browser/suggestController";
import "monaco-editor/languages/definitions/java/register";
import "monaco-editor/languages/definitions/python/register";
import "monaco-editor/languages/definitions/sql/register";
import "monaco-editor/languages/definitions/shell/register";
import { loader } from "@monaco-editor/react";
import EditorWorker from "monaco-editor/editor/editor.worker?worker";

self.MonacoEnvironment = {
  getWorker() {
    return new EditorWorker();
  },
};

loader.config({ monaco });
