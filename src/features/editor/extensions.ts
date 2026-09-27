import { EditorSelection, type Extension } from '@codemirror/state';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags } from '@lezer/highlight';
import { EditorView } from '@codemirror/view';
import { ENVIRONMENTS } from './completion';

/** An input handler avoids changing documents during prop synchronization or undo. */
export const closeEnvironment: Extension = EditorView.inputHandler.of((view, from, to, text) => {
  if (text !== '}' || from !== to) return false;
  const line = view.state.doc.lineAt(from);
  const match = /\\begin\{([A-Za-z*]+)$/.exec(view.state.sliceDoc(line.from, from));
  if (!match || !ENVIRONMENTS.includes(match[1])) return false;
  const environment = match[1];
  // Count nested environments: an existing matching end should be reused.
  let depth = 1;
  for (const token of view.state.sliceDoc(to).matchAll(/\\(begin|end)\{([^}]+)\}/g)) {
    if (token[2] !== environment) continue;
    depth += token[1] === 'begin' ? 1 : -1;
    if (depth === 0) return false;
  }
  const indent = /^\s*/.exec(line.text)?.[0] ?? '';
  const insert = `}\n${indent}  \n${indent}\\end{${environment}}`;
  view.dispatch({ changes: { from, to: view.state.sliceDoc(to, to + 1) === '}' ? to + 1 : to, insert }, selection: EditorSelection.cursor(from + 2 + indent.length + 2), userEvent: 'input.type' });
  return true;
});

export function editorTheme(dark: boolean) {
  return EditorView.theme({
    '&': { height: '100%', backgroundColor: 'transparent', color: dark ? '#ededed' : '#222222', fontSize: '14px' },
    '.cm-scroller': { overflow: 'auto', fontFamily: '"SFMono-Regular", Consolas, "Liberation Mono", monospace', lineHeight: '1.5' },
    '.cm-content': { padding: '8px 0', minHeight: '100%', caretColor: dark ? '#ededed' : '#222222' },
    '.cm-line': { padding: '0 18px 0 8px' },
    '.cm-gutters': { backgroundColor: 'transparent', color: '#888888', border: 'none' },
    '.cm-lineNumbers .cm-gutterElement': { padding: '0 10px 0 16px' },
    '.cm-activeLine, .cm-activeLineGutter': { backgroundColor: dark ? '#ffffff05' : '#00000004' },
    '&.cm-focused': { outline: 'none' },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection': { backgroundColor: dark ? '#264f78 !important' : '#b5d5ff !important' },
    '.cm-cursor': { borderLeftColor: dark ? '#ededed' : '#222222' },
    '.cm-tooltip': { backgroundColor: dark ? '#292929' : '#ffffff', color: dark ? '#ededed' : '#222222', border: `1px solid ${dark ? '#484848' : '#cccccc'}`, borderRadius: '4px' },
    '.cm-tooltip-autocomplete ul li[aria-selected]': { backgroundColor: dark ? '#264f78' : '#b5d5ff', color: 'inherit' },
    '.cm-panels': { backgroundColor: dark ? '#292929' : '#f2f2f2', color: 'inherit' },
    '.cm-textfield': { backgroundColor: 'transparent', color: 'inherit' },
  }, { dark });
}

export function editorHighlight(dark: boolean) {
  return syntaxHighlighting(HighlightStyle.define([
    { tag: [tags.keyword, tags.tagName, tags.function(tags.variableName)], color: dark ? '#c5a5f5' : '#7b3fa1' },
    { tag: [tags.atom, tags.number, tags.bool], color: dark ? '#e8b789' : '#8b551f' },
    { tag: [tags.string, tags.special(tags.string)], color: dark ? '#c4d693' : '#586c20' },
    { tag: [tags.variableName, tags.special(tags.variableName), tags.typeName], color: dark ? '#b8caff' : '#495d99' },
    { tag: [tags.operator, tags.bracket, tags.punctuation], color: dark ? '#c3cbd0' : '#596873' },
    { tag: tags.comment, color: dark ? '#999999' : '#777777', fontStyle: 'italic' },
    { tag: tags.invalid, color: dark ? '#ffa49c' : '#bd473c', textDecoration: 'underline' },
  ]));
}
