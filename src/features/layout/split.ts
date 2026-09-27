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
