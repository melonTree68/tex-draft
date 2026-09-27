import { describe, expect, it } from 'vitest';
import { loadDraft, loadPreferences, saveJson, STORAGE_KEYS } from './store';
describe('local draft persistence',()=>{
 it('starts empty and restores draft without interpreting TeX',()=>{localStorage.clear();expect(loadDraft(localStorage)).toEqual({source:'',macros:''});const draft={source:'\\sum_{i=0}^n x_i',macros:'\\def\\x{X}'};expect(saveJson(localStorage,STORAGE_KEYS.draft,draft)).toBe(true);expect(loadDraft(localStorage)).toEqual(draft);});
 it('recovers invalid preferences independently of valid fields',()=>{localStorage.setItem(STORAGE_KEYS.preferences,JSON.stringify({theme:'invalid',font:'pagella',locale:'zh',keybindings:{undo:33,find:'Mod-f'}}));expect(loadPreferences(localStorage)).toEqual({theme:'system',font:'pagella',locale:'zh',keybindings:{find:'Mod-f'}});});
 it('does not throw on malformed data or exhausted storage',()=>{localStorage.setItem(STORAGE_KEYS.draft,'broken');expect(loadDraft(localStorage)).toEqual({source:'',macros:''});expect(saveJson({setItem(){throw new Error('quota');}},'key',{})).toBe(false);});
});
