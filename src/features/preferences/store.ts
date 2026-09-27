import { sanitizeKeybindings } from '../editor/commands';
export type Locale = 'en' | 'zh';
export type Theme = 'light' | 'dark' | 'system';
export type Font = 'latin-modern' | 'pagella' | 'termes';
export interface Preferences { locale: Locale; theme: Theme; font: Font; keybindings: Record<string,string>; codeFontSize:number; previewFontSize:number; cursorBlink:boolean; activeLineHighlight:number; paneRatio:number }
export interface Draft { source: string; macros: string }
export const defaultPreferences: Preferences = { locale: 'en', theme: 'system', font: 'latin-modern', keybindings: {}, codeFontSize:14, previewFontSize:18, cursorBlink:true, activeLineHighlight:4, paneRatio:0.5 };
export const STORAGE_KEYS = { preferences: 'texdraft.preferences.v1', draft: 'texdraft.draft.v1', presets: 'texdraft.presets.v1' };
export function readJson(storage: Pick<Storage,'getItem'>, key: string): unknown { try { return JSON.parse(storage.getItem(key) ?? 'null'); } catch { return null; } }
export function saveJson(storage: Pick<Storage,'setItem'>, key: string, value: unknown): boolean { try { storage.setItem(key, JSON.stringify(value)); return true; } catch { return false; } }
function numberPreference(value:unknown,fallback:number,min:number,max:number):number { return typeof value==='number' && Number.isFinite(value) ? Math.min(max,Math.max(min,value)) : fallback; }
export function loadPreferences(storage: Pick<Storage,'getItem'>): Preferences {
  const item = readJson(storage, STORAGE_KEYS.preferences) as Partial<Preferences> | null;
  return {
    locale: item?.locale === 'zh' || (item?.locale !== 'en' && typeof navigator !== 'undefined' && navigator.language.startsWith('zh')) ? 'zh' : 'en',
    theme: ['light','dark','system'].includes(item?.theme ?? '') ? item!.theme! : 'system',
    font: ['latin-modern','pagella','termes'].includes(item?.font ?? '') ? item!.font! : 'latin-modern',
    keybindings: item?.keybindings && typeof item.keybindings === 'object' ? sanitizeKeybindings(item.keybindings) : {},
    codeFontSize:numberPreference(item?.codeFontSize,14,8,32), previewFontSize:numberPreference(item?.previewFontSize,18,8,64),
    cursorBlink:typeof item?.cursorBlink==='boolean'?item.cursorBlink:true,
    activeLineHighlight:numberPreference(item?.activeLineHighlight,4,0,30), paneRatio:numberPreference(item?.paneRatio,0.5,0.1,0.9),
  };
}
export function loadDraft(storage: Pick<Storage,'getItem'>): Draft {
  const item = readJson(storage, STORAGE_KEYS.draft) as Partial<Draft> | null;
  return { source: typeof item?.source === 'string' ? item.source : '', macros: typeof item?.macros === 'string' ? item.macros : '' };
}
