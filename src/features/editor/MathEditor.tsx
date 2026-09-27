import { useEffect, useRef } from 'react';
import { Compartment, EditorState, Prec } from '@codemirror/state';
import { EditorView, drawSelection, highlightActiveLine, highlightActiveLineGutter, keymap, lineNumbers } from '@codemirror/view';
import { history, indentLess, indentMore } from '@codemirror/commands';
import { StreamLanguage, bracketMatching, indentUnit } from '@codemirror/language';
import { stex } from '@codemirror/legacy-modes/mode/stex';
import { acceptCompletion, autocompletion, closeBrackets, closeBracketsKeymap, completionKeymap, nextSnippetField, prevSnippetField } from '@codemirror/autocomplete';
import { search } from '@codemirror/search';
import { EDITOR_COMMANDS, editorKeymap, navigationKeymap } from './commands';
import { mathCompletionSource } from './completion';
import { closeEnvironment, editorHighlight, editorTheme } from './extensions';

export interface MathEditorProps {
  value: string;
  onChange: (value: string) => void;
  mode: 'math' | 'macros';
  theme: 'light' | 'dark';
  keybindings?: Record<string, string>;
  ariaLabel: string;
  macros?: string;
  locale?: 'en' | 'zh';
  fontSize?: number;
  cursorBlink?: boolean;
  activeLineHighlight?: number;
}
export function MathEditor({ value, onChange, mode, theme, keybindings, ariaLabel, macros = '', locale = 'en', fontSize = 14, cursorBlink = true, activeLineHighlight = 4 }: MathEditorProps) {
  const host = useRef<HTMLDivElement>(null);
  const editor = useRef<EditorView | null>(null);
  const callback = useRef(onChange);
  const compartments = useRef({ theme: new Compartment(), appearance: new Compartment(), keys: new Compartment(), completion: new Compartment(), label: new Compartment(), locale: new Compartment() });
  callback.current = onChange;
  useEffect(() => {
    if (!host.current) return;
    const slots = compartments.current;
    const language = StreamLanguage.define(stex);
    const view = new EditorView({
      parent: host.current,
      state: EditorState.create({ doc: value, extensions: [
        lineNumbers(), history(),
        slots.appearance.of(editorAppearance(cursorBlink, activeLineHighlight)),
        EditorState.allowMultipleSelections.of(true), EditorView.lineWrapping,
        language, language.data.of({ commentTokens: { line: '%' }, closeBrackets: { brackets: ['(', '[', '{'] } }),
        bracketMatching(), indentUnit.of('  '),
        // Environment handler must run before brace-closing logic.
        Prec.highest(closeEnvironment), closeBrackets(), search({ top: true }),
        slots.keys.of(Prec.high(editorKeymap(keybindings))),
        keymap.of([
          { key: 'Tab', run: view => nextSnippetField(view) || acceptCompletion(view) || indentMore(view) },
          { key: 'Shift-Tab', run: view => prevSnippetField(view) || indentLess(view) },
          ...closeBracketsKeymap, ...completionKeymap.filter(binding => !EDITOR_COMMANDS.some(command => command.run === binding.run)), ...navigationKeymap,
        ]),
        slots.completion.of(autocompletion({ override: [mathCompletionSource(macros, locale)], defaultKeymap: false })),
        slots.locale.of(EditorState.phrases.of(locale === 'zh' ? SEARCH_ZH : {})),
        slots.theme.of([editorTheme(theme === 'dark', fontSize, activeLineHighlight, cursorBlink), editorHighlight(theme === 'dark')]),
        slots.label.of(EditorView.contentAttributes.of({ 'aria-label': ariaLabel, 'aria-multiline': 'true', spellcheck: 'false' })),
        EditorView.updateListener.of(update => { if (update.docChanged) callback.current(update.state.doc.toString()); }),
      ] }),
    });
    editor.current = view;
    return () => { view.destroy(); editor.current = null; };
    // Compartments apply subsequent props without resetting undo history or focus.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    const view = editor.current;
    if (view && view.state.doc.toString() !== value) view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: value } });
  }, [value]);
  useEffect(() => { editor.current?.dispatch({ effects: compartments.current.theme.reconfigure([editorTheme(theme === 'dark', fontSize, activeLineHighlight, cursorBlink), editorHighlight(theme === 'dark')]) }); }, [theme, fontSize, activeLineHighlight, cursorBlink]);
  useEffect(() => { editor.current?.dispatch({ effects: compartments.current.appearance.reconfigure(editorAppearance(cursorBlink, activeLineHighlight)) }); }, [cursorBlink, activeLineHighlight]);
  useEffect(() => { editor.current?.dispatch({ effects: compartments.current.keys.reconfigure(Prec.high(editorKeymap(keybindings))) }); }, [keybindings]);
  useEffect(() => { editor.current?.dispatch({ effects: compartments.current.completion.reconfigure(autocompletion({ override: [mathCompletionSource(macros, locale)], defaultKeymap: false })) }); }, [macros, locale]);
  useEffect(() => { editor.current?.dispatch({ effects: compartments.current.label.reconfigure(EditorView.contentAttributes.of({ 'aria-label': ariaLabel, 'aria-multiline': 'true', spellcheck: 'false' })) }); }, [ariaLabel]);
  useEffect(() => { editor.current?.dispatch({ effects: compartments.current.locale.reconfigure(EditorState.phrases.of(locale === 'zh' ? SEARCH_ZH : {})) }); }, [locale]);
  return <div ref={host} className={`math-editor math-editor--${mode}`} style={{ height: '100%', minHeight: 0 }} />;
}

const SEARCH_ZH = { 'Find': '查找', 'Replace': '替换', 'next': '下一个', 'previous': '上一个', 'all': '全部', 'match case': '区分大小写', 'by word': '全字匹配', 'regexp': '正则表达式', 'replace': '替换', 'replace all': '全部替换', 'close': '关闭', 'Go to line': '转到行', 'go': '转到', 'Selection deleted': '已删除选中内容', 'No matches': '无匹配项', 'current match': '当前匹配项' };

function editorAppearance(cursorBlink: boolean, activeLineHighlight: number) {
  return [drawSelection({ cursorBlinkRate: cursorBlink ? 1200 : 0 }), ...(activeLineHighlight > 0 ? [highlightActiveLine(), highlightActiveLineGutter()] : [])];
}
