import { describe,expect,it } from 'vitest';
import { clampSplit,draggedSplit,splitBounds,clampMacroHeight,draggedMacroHeight,macroHeightBounds } from './split';
describe('pane resizing',()=>{
 it('snaps within twelve pixels of center',()=>{expect(draggedSplit(488,1000)).toBe(0.5);expect(draggedSplit(512,1000)).toBe(0.5);expect(draggedSplit(487,1000)).toBe(0.487);});
 it('keeps both panes usable at either edge and after narrowing',()=>{expect(draggedSplit(-50,1000)).toBe(0.24);expect(draggedSplit(1100,1000)).toBe(0.76);expect(clampSplit(0.2,640)).toBe(0.375);expect(splitBounds(400)).toEqual([0.5,0.5]);});
});

describe('macro height resizing',()=>{
 it('snaps within twelve pixels of the default editor height',()=>{expect(draggedMacroHeight(100,600)).toBe(112);expect(draggedMacroHeight(124,600)).toBe(112);expect(draggedMacroHeight(125,600)).toBe(125);});
 it('keeps macro and source minimum heights with graceful small-window bounds',()=>{expect(macroHeightBounds(600)).toEqual([48,504]);expect(clampMacroHeight(900,600)).toBe(504);expect(clampMacroHeight(12,600)).toBe(48);expect(macroHeightBounds(60)).toEqual([30,30]);expect(draggedMacroHeight(35,60)).toBe(30);});
});
