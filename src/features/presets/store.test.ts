import { describe, expect, it } from 'vitest';
import { addPreset, parsePresets, renamePreset } from './store';
describe('macro preset collections',()=>{
 it('starts empty without examples and accepts only valid stored records',()=>{expect(parsePresets(null)).toEqual([]);expect(parsePresets([{id:'a',name:'A',macros:'\\def\\a{a}'},{name:'broken'}])).toHaveLength(1);});
 it('saves verbatim macros and renames without changing definitions',()=>{const presets=addPreset([],' Algebra ','\\DeclareMathOperator{\\rank}{rank}','id');const renamed=renamePreset(presets,'id','Operators');expect(renamed[0]).toEqual({id:'id',name:'Operators',macros:'\\DeclareMathOperator{\\rank}{rank}'});expect(presets[0].name).toBe('Algebra');});
 it('rejects duplicate or blank names while preserving collections',()=>{const presets=addPreset([],'Algebra','x','id');expect(()=>addPreset(presets,' algebra ','y','id2')).toThrow();expect(()=>renamePreset(presets,'id',' ')).toThrow();expect(presets).toHaveLength(1);});
});
