import { describe,expect,it } from 'vitest';
import { clampSplit,draggedSplit,splitBounds } from './split';
describe('pane resizing',()=>{
 it('snaps within twelve pixels of center',()=>{expect(draggedSplit(488,1000)).toBe(0.5);expect(draggedSplit(512,1000)).toBe(0.5);expect(draggedSplit(487,1000)).toBe(0.487);});
 it('keeps both panes usable at either edge and after narrowing',()=>{expect(draggedSplit(-50,1000)).toBe(0.24);expect(draggedSplit(1100,1000)).toBe(0.76);expect(clampSplit(0.2,640)).toBe(0.375);expect(splitBounds(400)).toEqual([0.5,0.5]);});
});
