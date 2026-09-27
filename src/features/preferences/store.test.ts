import { describe, expect, it } from 'vitest';
import { defaultPreferences, loadDraft, loadPreferences, saveJson, STORAGE_KEYS } from './store';
describe('local draft persistence',()=>{
 it('starts empty and restores draft without interpreting TeX',()=>{localStorage.clear();expect(loadDraft(localStorage)).toEqual({source:'',macros:''});const draft={source:'\\sum_{i=0}^n x_i',macros:'\\def\\x{X}'};expect(saveJson(localStorage,STORAGE_KEYS.draft,draft)).toBe(true);expect(loadDraft(localStorage)).toEqual(draft);});
 it('recovers invalid preferences independently of valid fields',()=>{localStorage.setItem(STORAGE_KEYS.preferences,JSON.stringify({theme:'invalid',font:'pagella',locale:'zh',keybindings:{undo:33,find:'Mod-f'}}));expect(loadPreferences(localStorage)).toEqual({...defaultPreferences,theme:'system',font:'pagella',locale:'zh',keybindings:{find:'Mod-f'}});});
 it('does not throw on malformed data or exhausted storage',()=>{localStorage.setItem(STORAGE_KEYS.draft,'broken');expect(loadDraft(localStorage)).toEqual({source:'',macros:''});expect(saveJson({setItem(){throw new Error('quota');}},'key',{})).toBe(false);});
});

describe('editor and layout preferences',()=>{
 it('fills new fields for existing saved preferences',()=>{localStorage.setItem(STORAGE_KEYS.preferences,JSON.stringify({locale:'en',theme:'dark'}));expect(loadPreferences(localStorage)).toEqual({...defaultPreferences,theme:'dark'});});
 it('restores valid values including disabled blink and zero shading',()=>{const prefs={...defaultPreferences,codeFontSize:20,previewFontSize:32,cursorBlink:false,activeLineHighlight:0,paneRatio:0.65};saveJson(localStorage,STORAGE_KEYS.preferences,prefs);expect(loadPreferences(localStorage)).toEqual(prefs);});
 it('clamps numeric ranges and rejects invalid numeric and boolean types independently',()=>{saveJson(localStorage,STORAGE_KEYS.preferences,{locale:'en',codeFontSize:100,previewFontSize:2,cursorBlink:'false',activeLineHighlight:'20',paneRatio:-2});expect(loadPreferences(localStorage)).toEqual({...defaultPreferences,codeFontSize:32,previewFontSize:8,paneRatio:0.1});});
});


it('cleans up obsolete line commands and reserved chords without losing valid custom shortcuts', () => {
  saveJson(localStorage, STORAGE_KEYS.preferences, { keybindings: { insertBlankLineAbove: 'F8', selectAll: 'Mod-Shift-Enter', deleteLine: 'Mod-Enter', insertFormulaSeparator: 'F9', find: 'Mod-f', undo: '' } });
  expect(loadPreferences(localStorage).keybindings).toEqual({ insertFormulaSeparator: 'F9', find: 'Mod-f', undo: '' });
});
