// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { EditorState, Prec } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import { nextSnippetField, prevSnippetField, type Completion } from '@codemirror/autocomplete';
import { history, undo } from '@codemirror/commands';
import { MATH_COMPLETIONS, macroNames } from './completion';
import { closeEnvironment } from './extensions';
import { EDITOR_COMMANDS, sanitizeKeybindings, insertFormulaSeparator, insertBlankLineAbove, captureKeybinding, canonicalKeybinding, editorKeymap, navigationKeymap, platformDefaultKey, validateKeybinding } from './commands';
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


describe('shortcut recording', () => {
  const event = (key: string, code: string, modifiers: Partial<KeyboardEvent> = {}) => ({ key, code, ctrlKey: false, metaKey: false, altKey: false, shiftKey: false, ...modifiers });
  it('captures platform modifiers, punctuation, navigation, and space', () => {
    expect(captureKeybinding(event('K', 'KeyK', { ctrlKey: true, shiftKey: true }), 'other')).toBe('Mod-Shift-k');
    expect(captureKeybinding(event('k', 'KeyK', { metaKey: true, ctrlKey: true }), 'mac')).toBe('Ctrl-Mod-k');
    expect(captureKeybinding(event('?', 'Slash', { ctrlKey: true, shiftKey: true }), 'other')).toBe('Mod-Shift-/');
    expect(captureKeybinding(event(' ', 'Space', { ctrlKey: true }), 'mac')).toBe('Ctrl-Space');
    expect(captureKeybinding(event('ArrowUp', 'ArrowUp', { altKey: true }), 'mac')).toBe('Alt-ArrowUp');
    expect(captureKeybinding(event('F12', 'F12'), 'other')).toBe('F12');
  });
  it('preserves Option characters and non-US keys in CodeMirror notation', () => {
    expect(captureKeybinding(event('å', 'KeyA', { altKey: true }), 'mac')).toBe('Alt-å');
    expect(canonicalKeybinding('Alt-å', 'mac')).toBe('Alt-å');
    expect(captureKeybinding(event('å', 'KeyA', { altKey: true, metaKey: true }), 'mac')).toBe('Mod-Alt-a');
    expect(captureKeybinding(event('ж', 'KeySemicolon'), 'other')).toBe('ж');
    expect(captureKeybinding(event('?', 'Slash', { shiftKey: true }), 'other')).toBe('Shift-?');
  });
  it('ignores modifier-only and composition input', () => {
    expect(captureKeybinding(event('Shift', 'ShiftLeft', { shiftKey: true }))).toBeNull();
    expect(captureKeybinding(event('Dead', 'KeyE', { altKey: true }))).toBeNull();
    expect(captureKeybinding(event('a', 'KeyA', { isComposing: true }))).toBeNull();
    expect(captureKeybinding(event('a', 'KeyA', { keyCode: 229 }))).toBeNull();
  });
  it('reserves the settings shortcut and its aliases on each platform', () => {
    expect(canonicalKeybinding('Mod-,', 'mac')).toBeNull();
    expect(canonicalKeybinding('Cmd-,', 'mac')).toBeNull();
    expect(canonicalKeybinding('Control-,', 'other')).toBeNull();
    expect(canonicalKeybinding('Ctrl-,', 'mac')).toBe('Ctrl-,');
    expect(canonicalKeybinding('Mod-Shift-,', 'mac')).toBe('Meta-Shift-,');
  });
  it('dispatches captured shifted punctuation and Option characters', () => {
    for (const input of [event('?', 'Slash', { ctrlKey: true, shiftKey: true, keyCode: 191 }), event('å', 'KeyA', { altKey: true, keyCode: 65 })]) {
      const view = makeView('hello');
      view.dispatch({ effects: StateEffect.reconfigure.of([editorKeymap({ selectAll: captureKeybinding(input, 'other')! })]) });
      view.contentDOM.dispatchEvent(new KeyboardEvent('keydown', { ...input, bubbles: true, cancelable: true }));
      expect(view.state.selection.main.to - view.state.selection.main.from).toBe(5);
    }
  });
});


describe('formula and line insertion', () => {
  it.each([
    ['', 0, '%---\n', 5],
    ['x+y', 0, 'x+y\n%---\n', 9],
    ['x+y', 1, 'x+y\n%---\n', 9],
    ['x+y', 3, 'x+y\n%---\n', 9],
    ['x+y\nz', 1, 'x+y\n%---\n\nz', 9],
    ['x\n\nz', 2, 'x\n%---\n\nz', 7],
  ])('inserts a standalone delimiter in %j at %i', (doc, anchor, result, caret) => {
    const view = makeView(doc);
    view.dispatch({ selection: { anchor } });
    expect(insertFormulaSeparator(view)).toBe(true);
    expect(view.state.doc.toString()).toBe(result);
    expect(view.state.selection.main.head).toBe(caret);
    expect(view.state.doc.lineAt(caret).text).toBe('');
  });
  it('preserves selected text and inserts after the selection head line', () => {
    const view = makeView('abc\ndef');
    view.dispatch({ selection: { anchor: 1, head: 5 } });
    insertFormulaSeparator(view);
    expect(view.state.doc.toString()).toBe('abc\ndef\n%---\n');
    expect(view.state.selection.main.empty).toBe(true);
  });
  it.each([0, 2, 5])('inserts above the current line at cursor %i and preserves indentation', anchor => {
    const view = makeView('  abc\nnext');
    view.dispatch({ selection: { anchor } });
    insertBlankLineAbove(view);
    expect(view.state.doc.toString()).toBe('  \n  abc\nnext');
    expect(view.state.selection.main.head).toBe(2);
  });
  it('inserts above a later selected line without deleting the selection', () => {
    const view = makeView('abc\ndef');
    view.dispatch({ selection: { anchor: 1, head: 5 } });
    insertBlankLineAbove(view);
    expect(view.state.doc.toString()).toBe('abc\n\ndef');
    expect(view.state.selection.main.head).toBe(4);
  });
  it('dispatches insertion shortcuts and retains the line-below shortcut', () => {
    const view = makeView('abc');
    view.dispatch({ effects: StateEffect.reconfigure.of([Prec.high(editorKeymap()), keymap.of(navigationKeymap)]) });
    const key = (ctrlKey: boolean, shiftKey: boolean, altKey = false) => view.contentDOM.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', ctrlKey, shiftKey, altKey, bubbles: true, cancelable: true }));
    key(true, true);
    expect(view.state.doc.toString()).toBe('\nabc');
    key(true, false, true);
    expect(view.state.doc.toString()).toBe('%---\n\nabc');
    key(true, false);
    expect(view.state.doc.toString()).toBe('%---\n\n\nabc');
  });
});


describe('fixed line shortcuts', () => {
  it('keeps line insertion out of the configurable registry and orders related actions together', () => {
    expect(EDITOR_COMMANDS.map(command => command.id)).toEqual(['undo', 'redo', 'selectAll', 'suggest', 'insertFormulaSeparator', 'find', 'replace', 'selectNext', 'comment', 'indent', 'outdent', 'moveLineUp', 'moveLineDown', 'copyLineUp', 'copyLineDown', 'deleteLine']);
    expect(EDITOR_COMMANDS.find(command => command.id === 'insertFormulaSeparator')?.defaultKey).toBe('Mod-Alt-Enter');
  });
  it.each(['mac', 'other'] as const)('dispatches fixed above/below keys on %s despite obsolete or conflicting overrides', platform => {
    const view = makeView('abc');
    const primary = platform === 'mac' ? { metaKey: true } : { ctrlKey: true };
    const other = platform === 'mac' ? { ctrlKey: true } : { metaKey: true };
    view.dispatch({ effects: StateEffect.reconfigure.of([editorKeymap({ insertBlankLineAbove: 'F8', selectAll: 'Mod-Shift-Enter', deleteLine: 'Mod-Enter' }, platform)]) });
    const press = (key: string, modifiers = {}) => view.contentDOM.dispatchEvent(new KeyboardEvent('keydown', { key, ...modifiers, bubbles: true, cancelable: true }));
    press('F8');
    press('Enter', { ...other, shiftKey: true });
    expect(view.state.doc.toString()).toBe('abc');
    press('Enter', { ...primary, shiftKey: true });
    expect(view.state.doc.toString()).toBe('\nabc');
    expect(view.state.selection.main.head).toBe(0);
    press('Enter', primary);
    expect(view.state.doc.toString()).toBe('\n\nabc');
    expect(view.state.selection.main.head).toBe(1);
  });
  it.each(['mac', 'other'] as const)('rejects fixed chords and aliases while preserving formula separator remapping on %s', platform => {
    const alias = platform === 'mac' ? 'Cmd' : 'Control';
    for (const key of ['Mod-Enter', 'Mod-Shift-Enter', `${alias}-Enter`, `Shift-${alias}-Enter`]) expect(canonicalKeybinding(key, platform)).toBeNull();
    const overrides = { insertBlankLineAbove: 'F8', selectAll: `${alias}-Shift-Enter`, deleteLine: 'Mod-Enter', insertFormulaSeparator: 'F9', undo: '', find: 'Mod-f' };
    expect(sanitizeKeybindings(overrides, platform)).toEqual({ insertFormulaSeparator: 'F9', undo: '', find: 'Mod-f' });
    const view = makeView('x');
    view.dispatch({ effects: StateEffect.reconfigure.of([editorKeymap(overrides, platform)]) });
    view.contentDOM.dispatchEvent(new KeyboardEvent('keydown', { key: 'F9', bubbles: true, cancelable: true }));
    expect(view.state.doc.toString()).toBe('x\n%---\n');
  });
});
