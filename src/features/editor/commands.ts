import { copyLineDown, copyLineUp, defaultKeymap, deleteLine, historyKeymap, indentLess, indentMore, moveLineDown, moveLineUp, redo, selectAll, toggleLineComment, undo } from '@codemirror/commands';
import { selectNextOccurrence, openSearchPanel, searchKeymap } from '@codemirror/search';
import { startCompletion } from '@codemirror/autocomplete';
import { keymap, type Command, type KeyBinding } from '@codemirror/view';

const currentPlatform = (): 'mac' | 'other' => typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform) ? 'mac' : 'other';
export function platformDefaultKey(command: 'redo' | 'replace', platform = currentPlatform()): string {
  if (command === 'redo') return platform === 'mac' ? 'Mod-Shift-z' : 'Ctrl-y';
  return platform === 'mac' ? 'Mod-Alt-f' : 'Mod-h';
}

export const EDITOR_COMMANDS = [
  { id: 'undo', labelEn: 'Undo', labelZh: '撤销', defaultKey: 'Mod-z', run: undo },
  { id: 'redo', labelEn: 'Redo', labelZh: '重做', defaultKey: platformDefaultKey('redo'), run: redo },
  { id: 'selectAll', labelEn: 'Select all', labelZh: '全选', defaultKey: 'Mod-a', run: selectAll },
  { id: 'comment', labelEn: 'Toggle comment', labelZh: '切换行注释', defaultKey: 'Mod-/', run: toggleLineComment },
  { id: 'moveLineUp', labelEn: 'Move line up', labelZh: '向上移动行', defaultKey: 'Alt-ArrowUp', run: moveLineUp },
  { id: 'moveLineDown', labelEn: 'Move line down', labelZh: '向下移动行', defaultKey: 'Alt-ArrowDown', run: moveLineDown },
  { id: 'copyLineUp', labelEn: 'Copy line up', labelZh: '向上复制行', defaultKey: 'Alt-Shift-ArrowUp', run: copyLineUp },
  { id: 'copyLineDown', labelEn: 'Copy line down', labelZh: '向下复制行', defaultKey: 'Alt-Shift-ArrowDown', run: copyLineDown },
  { id: 'deleteLine', labelEn: 'Delete line', labelZh: '删除行', defaultKey: 'Mod-Shift-k', run: deleteLine },
  { id: 'selectNext', labelEn: 'Select next occurrence', labelZh: '选择下一个匹配项', defaultKey: 'Mod-d', run: selectNextOccurrence },
  { id: 'find', labelEn: 'Find', labelZh: '查找', defaultKey: 'Mod-f', run: openSearchPanel },
  { id: 'replace', labelEn: 'Find and replace', labelZh: '查找替换', defaultKey: platformDefaultKey('replace'), run: openSearchPanel },
  { id: 'suggest', labelEn: 'Show completions', labelZh: '显示补全', defaultKey: 'Ctrl-Space', run: startCompletion },
  { id: 'indent', labelEn: 'Indent', labelZh: '增加缩进', defaultKey: 'Mod-]', run: indentMore },
  { id: 'outdent', labelEn: 'Outdent', labelZh: '减少缩进', defaultKey: 'Mod-[', run: indentLess },
] satisfies Array<{ id: string; labelEn: string; labelZh: string; defaultKey: string; run: Command }>;

/** Normalize CodeMirror aliases and modifier order for conflict detection and dispatch. */
export function canonicalKeybinding(value: string, platform: 'mac' | 'other' = currentPlatform()): string | null {
  if (!value) return '';
  const match = /^(.*?)((?:Arrow(?:Up|Down|Left|Right)|PageUp|PageDown|Backspace|Delete|Escape|Enter|Space|Home|End|Tab|F(?:[1-9]|1[0-9]|2[0-4])|[A-Za-z0-9\[\]\/.,;='`\\-]))$/.exec(value);
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
  return [...['Ctrl', 'Meta', 'Alt', 'Shift'].filter(modifier => normalized.has(modifier)), key].join('-');
}
export function validateKeybinding(value: string): boolean {
  return canonicalKeybinding(value) !== null;
}

export function editorKeymap(overrides: Record<string, string> = {}) {
  const bindings: KeyBinding[] = EDITOR_COMMANDS.flatMap(command => {
    const value = overrides[command.id];
    const key = value !== undefined && validateKeybinding(value) ? value : command.defaultKey;
    return key ? [{ key: canonicalKeybinding(key)!, run: command.run, preventDefault: true }] : [];
  });
  // Keep panel navigation, while custom mappings fully replace the corresponding defaults.
  const owned = new Set(EDITOR_COMMANDS.map(command => command.run));
  return keymap.of([...bindings, ...historyKeymap.filter(binding => !owned.has(binding.run!)), ...searchKeymap.filter(binding => !owned.has(binding.run!))]);
}

export const navigationKeymap = defaultKeymap.filter(binding => !EDITOR_COMMANDS.some(command => command.run === binding.run));
