export const DEFAULT_SPLIT = 0.5;
export function splitBounds(width:number):[number,number] {
 const minimum=Math.min(240/Math.max(width,1),0.5);
 return [minimum,1-minimum];
}
export function clampSplit(ratio:number,width:number):number {
 const [min,max]=splitBounds(width);
 return Math.min(max,Math.max(min,ratio));
}
export function draggedSplit(position:number,width:number):number {
 if(width<=0) return DEFAULT_SPLIT;
 return clampSplit(Math.abs(position-width*DEFAULT_SPLIT)<=12?DEFAULT_SPLIT:position/width,width);
}

export const DEFAULT_MACRO_HEIGHT = 112;
export function macroHeightBounds(availableHeight:number):[number,number] {
 const available=Math.max(0,availableHeight);
 const minimum=Math.min(48,available/2);
 return [minimum,Math.max(minimum,available-96)];
}
export function clampMacroHeight(height:number,availableHeight:number):number {
 const [min,max]=macroHeightBounds(availableHeight);
 return Math.min(max,Math.max(min,height));
}
export function draggedMacroHeight(height:number,availableHeight:number):number {
 const baseline=clampMacroHeight(DEFAULT_MACRO_HEIGHT,availableHeight);
 return clampMacroHeight(Math.abs(height-baseline)<=12?baseline:height,availableHeight);
}
