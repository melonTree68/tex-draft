// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { EditorState, Prec } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import { nextSnippetField, prevSnippetField, type Completion } from '@codemirror/autocomplete';
import { history } from '@codemirror/commands';
import { MATH_COMPLETIONS, macroNames } from './completion';
import { closeEnvironment } from './extensions';
import { canonicalKeybinding, editorKeymap, navigationKeymap, platformDefaultKey, validateKeybinding } from './commands';
const views: EditorView[] = [];
function makeView(doc = '') {
  const view = new EditorView({ parent: document.body, state: EditorState.create({ doc, selection: { anchor: doc.length }, extensions: [EditorState.allowMultipleSelections.of(true), closeEnvironment] }) });
  views.push(view);
  return view;
}
afterEach(() => { for (const view of views.splice(0)) view.destroy(); });
function apply(view: EditorView, completion: Completion) {
  if (typeof completion.apply !== 'function') throw new Error('Missing snippet');
  completion.apply(view, completion, 0, view.state.doc.length);
}
function typeClosingBrace(view: EditorView) {
  const { from, to } = view.state.selection.main;
  const handled = view.state.facet(EditorView.inputHandler).some(handler => handler(view, from, to, '}', () => view.state.update({ changes: { from, to, insert: '}' } })));
  if (!handled) view.dispatch({ changes: { from, to, insert: '}' } });
}
describe('math authoring', () => {
  it('moves through sum fields in both directions and exits on the final field', () => {
    const view = makeView();
    apply(view, MATH_COMPLETIONS.find(completion => completion.label === '\\sum')!);
    expect(view.state.doc.toString()).toBe('\\sum_{}^{}');
    expect(view.state.selection.main.from).toBe(6);
    view.dispatch(view.state.replaceSelection('i=1'));
    expect(nextSnippetField(view)).toBe(true);
    expect(view.state.selection.main.from).toBe(12);
    expect(prevSnippetField(view)).toBe(true);
    expect(view.state.sliceDoc(view.state.selection.main.from, view.state.selection.main.to)).toBe('i=1');
    expect(nextSnippetField(view)).toBe(true);
    view.dispatch(view.state.replaceSelection('n'));
    expect(nextSnippetField(view)).toBe(true);
    expect(view.state.selection.main.from).toBe(view.state.doc.length);
    expect(nextSnippetField(view)).toBe(false);
  });
  it('mirrors environment snippet names', () => {
    const view = makeView();
    apply(view, MATH_COMPLETIONS.find(completion => completion.label === '\\begin')!);
    view.dispatch(view.state.replaceSelection('cases'));
    expect(view.state.doc.toString()).toBe('\\begin{cases}\n  \n\\end{cases}');
  });
  it('closes a typed environment and positions cursor on an indented interior line', () => {
    const view = makeView('\\begin{aligned');
    typeClosingBrace(view);
    expect(view.state.doc.toString()).toBe('\\begin{aligned}\n  \n\\end{aligned}');
    expect(view.state.doc.lineAt(view.state.selection.main.head).number).toBe(2);
  });
  it('consumes an auto-inserted closing brace', () => {
    const view = makeView('\\begin{aligned}');
    view.dispatch({ selection: { anchor: view.state.doc.length - 1 } });
    typeClosingBrace(view);
    expect(view.state.doc.toString()).toBe('\\begin{aligned}\n  \n\\end{aligned}');
  });
  it('does not duplicate an existing end or expand unknown environments', () => {
    const view = makeView('\\begin{aligned\nx\n\\end{aligned}');
    view.dispatch({ selection: { anchor: 14 } });
    typeClosingBrace(view);
    expect(view.state.doc.toString()).toBe('\\begin{aligned}\nx\n\\end{aligned}');
    const unknown = makeView('\\begin{unknown');
    typeClosingBrace(unknown);
    expect(unknown.state.doc.toString()).toBe('\\begin{unknown}');
  });
  it('extracts command and primitive definitions while excluding comments', () => {
    expect(macroNames('\\newcommand{\\foo}[2]{#1+#2}\n\\def\\bar#1{#1}\n\\DeclareMathOperator*{\\argmax}{argmax}\n% \\def\\hidden{0}')).toEqual(['\\foo', '\\bar', '\\argmax']);
  });
  it('remaps a command while disabling the original binding', () => {
    const view = makeView('hello');
    view.dispatch({ effects: StateEffect.reconfigure.of([history(), Prec.high(editorKeymap({ selectAll: 'Ctrl-q' })), keymap.of(navigationKeymap)]) });
    view.contentDOM.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', ctrlKey: true, bubbles: true, cancelable: true }));
    expect(view.state.selection.main.empty).toBe(true);
    view.contentDOM.dispatchEvent(new KeyboardEvent('keydown', { key: 'q', ctrlKey: true, bubbles: true, cancelable: true }));
    expect(view.state.selection.main.from).toBe(0);
    expect(view.state.selection.main.to).toBe(5);
  });
  it('uses platform-native defaults for redo and replace', () => {
    expect(platformDefaultKey('redo', 'mac')).toBe('Mod-Shift-z');
    expect(platformDefaultKey('redo', 'other')).toBe('Ctrl-y');
    expect(platformDefaultKey('replace', 'mac')).toBe('Mod-Alt-f');
    expect(platformDefaultKey('replace', 'other')).toBe('Mod-h');
  });
  it('detects platform Mod collisions and modifier-order aliases', () => {
    expect(canonicalKeybinding('Shift-Mod-K', 'mac')).toBe(canonicalKeybinding('Cmd-Shift-k', 'mac'));
    expect(canonicalKeybinding('Shift-Mod-K', 'other')).toBe(canonicalKeybinding('Control-Shift-k', 'other'));
    expect(canonicalKeybinding('Alt-Control-Shift-x', 'other')).toBe(canonicalKeybinding('Shift-Ctrl-Alt-X', 'other'));
    expect(canonicalKeybinding('Mod-f', 'mac')).not.toBe(canonicalKeybinding('Ctrl-f', 'mac'));
    expect(canonicalKeybinding('Mod-f', 'other')).not.toBe(canonicalKeybinding('Meta-f', 'other'));
    expect(canonicalKeybinding('Mod-Meta-f', 'mac')).toBeNull();
    expect(canonicalKeybinding('Mod-Control-f', 'other')).toBeNull();
  });
  it('validates configurable shortcut notation', () => {
    expect(validateKeybinding('Mod-Shift-k')).toBe(true);
    expect(validateKeybinding('Alt-ArrowUp')).toBe(true);
    expect(validateKeybinding('bad-shortcut')).toBe(false);
    expect(validateKeybinding('Tab')).toBe(false);
    expect(validateKeybinding('Shift-Tab')).toBe(false);
    expect(canonicalKeybinding('Shift-Mod-K', 'mac')).toBe('Meta-Shift-k');
    expect(canonicalKeybinding('Cmd-Shift-k', 'mac')).toBe('Meta-Shift-k');
    expect(canonicalKeybinding('Control-q', 'other')).toBe('Ctrl-q');
  });
});
import { StateEffect } from '@codemirror/state';
