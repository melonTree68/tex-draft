import { EditorSelection } from '@codemirror/state';
import { copyLineDown, copyLineUp, defaultKeymap, deleteLine, historyKeymap, insertBlankLine, indentLess, indentMore, moveLineDown, moveLineUp, redo, selectAll, toggleLineComment, undo } from '@codemirror/commands';
import { selectNextOccurrence, openSearchPanel, searchKeymap } from '@codemirror/search';
import { startCompletion } from '@codemirror/autocomplete';
import { keymap, type Command, type KeyBinding } from '@codemirror/view';

const currentPlatform = (): 'mac' | 'other' => typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform) ? 'mac' : 'other';
export function platformDefaultKey(command: 'redo' | 'replace', platform = currentPlatform()): string {
  if (command === 'redo') return platform === 'mac' ? 'Mod-Shift-z' : 'Ctrl-y';
  return platform === 'mac' ? 'Mod-Alt-f' : 'Mod-h';
}

/** Insert after the current line so the delimiter can never become an inline comment. */
export const insertFormulaSeparator: Command = view => {
  if (view.state.readOnly) return false;
  const line = view.state.doc.lineAt(view.state.selection.main.head);
  const insert = `${line.length ? '\n' : ''}%---\n`;
  view.dispatch({ changes: { from: line.to, insert }, selection: EditorSelection.cursor(line.to + insert.length), scrollIntoView: true, userEvent: 'input' });
  return true;
};

export const insertBlankLineAbove: Command = view => {
  if (view.state.readOnly) return false;
  const line = view.state.doc.lineAt(view.state.selection.main.head);
  const indent = /^\s*/.exec(line.text)![0];
  view.dispatch({ changes: { from: line.from, insert: `${indent}\n` }, selection: EditorSelection.cursor(line.from + indent.length), scrollIntoView: true, userEvent: 'input' });
  return true;
};

export const EDITOR_COMMANDS = [
  { id: 'undo', labelEn: 'Undo', labelZh: '撤销', defaultKey: 'Mod-z', run: undo },
  { id: 'redo', labelEn: 'Redo', labelZh: '重做', defaultKey: platformDefaultKey('redo'), run: redo },
  { id: 'selectAll', labelEn: 'Select all', labelZh: '全选', defaultKey: 'Mod-a', run: selectAll },
  { id: 'suggest', labelEn: 'Show completions', labelZh: '显示补全', defaultKey: 'Ctrl-Space', run: startCompletion },
  { id: 'insertFormulaSeparator', labelEn: 'Insert formula separator', labelZh: '插入公式分隔线', defaultKey: 'Mod-Alt-Enter', run: insertFormulaSeparator },
  { id: 'find', labelEn: 'Find', labelZh: '查找', defaultKey: 'Mod-f', run: openSearchPanel },
  { id: 'replace', labelEn: 'Find and replace', labelZh: '查找替换', defaultKey: platformDefaultKey('replace'), run: openSearchPanel },
  { id: 'selectNext', labelEn: 'Select next occurrence', labelZh: '选择下一个匹配项', defaultKey: 'Mod-d', run: selectNextOccurrence },
  { id: 'comment', labelEn: 'Toggle comment', labelZh: '切换行注释', defaultKey: 'Mod-/', run: toggleLineComment },
  { id: 'indent', labelEn: 'Indent', labelZh: '增加缩进', defaultKey: 'Mod-]', run: indentMore },
  { id: 'outdent', labelEn: 'Outdent', labelZh: '减少缩进', defaultKey: 'Mod-[', run: indentLess },
  { id: 'moveLineUp', labelEn: 'Move line up', labelZh: '向上移动行', defaultKey: 'Alt-ArrowUp', run: moveLineUp },
  { id: 'moveLineDown', labelEn: 'Move line down', labelZh: '向下移动行', defaultKey: 'Alt-ArrowDown', run: moveLineDown },
  { id: 'copyLineUp', labelEn: 'Copy line up', labelZh: '向上复制行', defaultKey: 'Alt-Shift-ArrowUp', run: copyLineUp },
  { id: 'copyLineDown', labelEn: 'Copy line down', labelZh: '向下复制行', defaultKey: 'Alt-Shift-ArrowDown', run: copyLineDown },
  { id: 'deleteLine', labelEn: 'Delete line', labelZh: '删除行', defaultKey: 'Mod-Shift-k', run: deleteLine },
] satisfies Array<{ id: string; labelEn: string; labelZh: string; defaultKey: string; run: Command }>;

/** Normalize CodeMirror aliases and modifier order for conflict detection and dispatch. */
export function canonicalKeybinding(value: string, platform: 'mac' | 'other' = currentPlatform()): string | null {
  if (!value) return '';
  const match = /^(.*?)((?:Arrow(?:Up|Down|Left|Right)|PageUp|PageDown|Backspace|Delete|Escape|Enter|Space|Home|End|Tab|F(?:[1-9]|1[0-9]|2[0-4])|[^\s]))$/.exec(value);
  if (!match) return null;
  const prefix = match[1];
  const modifiers = prefix ? prefix.slice(0, -1).split('-') : [];
  if (prefix && !prefix.endsWith('-')) return null;
  const normalized = new Set<string>();
  for (const modifier of modifiers) {
    const name = modifier === 'Mod' ? (platform === 'mac' ? 'Meta' : 'Ctrl') : modifier === 'Cmd' ? 'Meta' : modifier === 'Control' ? 'Ctrl' : modifier;
    if (!['Ctrl', 'Meta', 'Alt', 'Shift'].includes(name) || normalized.has(name)) return null;
    normalized.add(name);
  }
  const key = match[2].length === 1 ? match[2].toLowerCase() : match[2];
  // Snippet traversal remains available independently of editing-command remaps.
  if (key === 'Tab' && [...normalized].every(modifier => modifier === 'Shift')) return null;
  if (key === 'Enter' && normalized.has(platform === 'mac' ? 'Meta' : 'Ctrl') && [...normalized].every(modifier => modifier === 'Shift' || modifier === (platform === 'mac' ? 'Meta' : 'Ctrl'))) return null;
  if (key === ',' && normalized.size === 1 && normalized.has(platform === 'mac' ? 'Meta' : 'Ctrl')) return null;
  return [...['Ctrl', 'Meta', 'Alt', 'Shift'].filter(modifier => normalized.has(modifier)), key].join('-');
}
export function validateKeybinding(value: string): boolean {
  return canonicalKeybinding(value) !== null;
}

/** Drop obsolete commands and invalid/reserved mappings when reading older preferences. */
export function sanitizeKeybindings(overrides: Record<string, unknown>, platform: 'mac' | 'other' = currentPlatform()): Record<string, string> {
  return Object.fromEntries(Object.entries(overrides).filter((entry): entry is [string, string] =>
    EDITOR_COMMANDS.some(command => command.id === entry[0]) && typeof entry[1] === 'string' && canonicalKeybinding(entry[1], platform) !== null));
}

export function editorKeymap(overrides: Record<string, string> = {}, platform: 'mac' | 'other' = currentPlatform()) {
  const bindings: KeyBinding[] = EDITOR_COMMANDS.flatMap(command => {
    const value = overrides[command.id];
    const key = value !== undefined && canonicalKeybinding(value, platform) !== null ? value : command.defaultKey;
    return key ? [{ key: canonicalKeybinding(key, platform)!, run: command.run, preventDefault: true }] : [];
  });
  // Keep panel navigation, while custom mappings fully replace the corresponding defaults.
  const owned = new Set(EDITOR_COMMANDS.map(command => command.run));
  const primary = platform === 'mac' ? 'Meta' : 'Ctrl';
  return keymap.of([
    { key: `${primary}-Shift-Enter`, run: insertBlankLineAbove, preventDefault: true },
    { key: `${primary}-Enter`, run: insertBlankLine, preventDefault: true },
    ...bindings, ...historyKeymap.filter(binding => !owned.has(binding.run!)), ...searchKeymap.filter(binding => !owned.has(binding.run!))]);
}

export const navigationKeymap = defaultKeymap.filter(binding => binding.run !== insertBlankLine && !EDITOR_COMMANDS.some(command => command.run === binding.run));


type ShortcutEvent = Pick<KeyboardEvent, 'key' | 'code' | 'ctrlKey' | 'metaKey' | 'altKey' | 'shiftKey'> & { isComposing?: boolean; keyCode?: number };
const physicalPunctuation: Record<string, string> = { Minus: '-', Equal: '=', BracketLeft: '[', BracketRight: ']', Backslash: '\\', Semicolon: ';', Quote: "'", Backquote: '`', Comma: ',', Period: '.', Slash: '/' };
/** Capture notation matching CodeMirror's character and modified physical-key lookup. */
export function captureKeybinding(event: ShortcutEvent, platform: 'mac' | 'other' = currentPlatform()): string | null {
  if (event.isComposing || event.keyCode === 229 || ['Control', 'Meta', 'Alt', 'AltGraph', 'Shift', 'CapsLock', 'Dead', 'Process', 'Unidentified'].includes(event.key)) return null;
  let key = event.key === ' ' ? 'Space' : event.key;
  // CodeMirror falls back to the physical key for Ctrl/Meta chords, but preserves
  // macOS Option characters and Windows AltGr text as typed characters.
  const physical = (event.ctrlKey || event.metaKey) && !(platform === 'other' && event.ctrlKey && event.altKey);
  if (physical) key = physicalPunctuation[event.code] ?? (/^Key[A-Z]$/.test(event.code) ? event.code.slice(3).toLowerCase() : /^Digit[0-9]$/.test(event.code) ? event.code.slice(5) : key);
  if (key.length === 1) key = key.toLowerCase();
  const modifiers = [event.ctrlKey && (platform === 'other' ? 'Mod' : 'Ctrl'), event.metaKey && (platform === 'mac' ? 'Mod' : 'Meta'), event.altKey && 'Alt', event.shiftKey && 'Shift'].filter(Boolean);
  return [...modifiers, key].join('-');
}
