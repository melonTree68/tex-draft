export interface MacroPreset { id: string; name: string; macros: string }
export function parsePresets(value: unknown): MacroPreset[] {
  if (!Array.isArray(value)) return [];
  return value.filter((p): p is MacroPreset => p && typeof p.id === 'string' && typeof p.name === 'string' && typeof p.macros === 'string');
}
export function addPreset(presets: MacroPreset[], name: string, macros: string, id: string): MacroPreset[] {
  const normalized = name.trim();
  if (!normalized || presets.some(p => p.name.toLocaleLowerCase() === normalized.toLocaleLowerCase())) throw new Error('name');
  return [...presets, {id, name: normalized, macros}];
}
export function renamePreset(presets: MacroPreset[], id: string, name: string): MacroPreset[] {
  const normalized = name.trim();
  if (!normalized || presets.some(p => p.id !== id && p.name.toLocaleLowerCase() === normalized.toLocaleLowerCase())) throw new Error('name');
  return presets.map(p => p.id === id ? {...p, name: normalized} : p);
}
