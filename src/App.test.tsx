import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
vi.mock('./features/editor',async importOriginal=>({...await importOriginal<typeof import('./features/editor')>(),MathEditor:()=> <div/>}));
vi.mock('./features/rendering',()=>({Preview:()=> <div/>}));
let host:HTMLDivElement,root:Root;
beforeEach(()=>{
 localStorage.clear();
 Object.defineProperty(HTMLElement.prototype,'clientWidth',{configurable:true,get:()=>1000});
 Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true,ResizeObserver:class {observe(){}disconnect(){}},matchMedia:()=>({matches:false,addEventListener(){},removeEventListener(){}})});
 HTMLDialogElement.prototype.showModal=function(){this.open=true;};
 HTMLDialogElement.prototype.close=function(){this.open=false;};
 host=document.createElement('div');document.body.append(host);root=createRoot(host);
 act(()=>root.render(<App/>));
});
afterEach(()=>{act(()=>root.unmount());host.remove();});
function key(value:string,options:KeyboardEventInit={}) {const event=new KeyboardEvent('keydown',{key:value,bubbles:true,cancelable:true,...options});act(()=>window.dispatchEvent(event));return event;}
function primary(){return /Mac|iPhone|iPad/.test(navigator.platform)?{metaKey:true}:{ctrlKey:true};}
describe('settings keyboard interaction',()=>{
 it('opens settings with the primary comma shortcut and prevents its default',()=>{expect(host.querySelector('dialog')?.open).toBe(false);expect(key(',',primary()).defaultPrevented).toBe(true);expect(host.querySelector('dialog')?.open).toBe(true);});
 it('captures keys without applying global actions and can cancel recording',()=>{
  key(',',primary());
  const button=host.querySelector<HTMLButtonElement>('.record-button')!;
  act(()=>button.click());key(',',primary());
  expect(host.querySelector<HTMLInputElement>('.shortcut-row input')?.value).toBe('Mod-,');
  expect(button.getAttribute('aria-pressed')).toBe('false');
  act(()=>host.querySelector<HTMLButtonElement>('.dialog-actions .primary')!.click());
  expect(host.querySelector('[role=alert]')?.textContent).toBeTruthy();
  act(()=>button.click());key('Escape');expect(button.getAttribute('aria-pressed')).toBe('false');expect(host.querySelector('dialog')?.open).toBe(true);
 });
});
describe('font size input',()=>{
 it('allows typing a multi-digit size before clamping on blur',()=>{
  key(',',primary());
  const input=host.querySelector<HTMLInputElement>('input[type=number]')!;
  const enter=(value:string)=>{act(()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(input,value);input.dispatchEvent(new Event('input',{bubbles:true}));});};
  enter('');enter('2');expect(input.value).toBe('2');enter('20');expect(input.value).toBe('20');
  expect(JSON.parse(localStorage.getItem('texdraft.preferences.v1')!).codeFontSize).toBe(20);
  enter('100');act(()=>input.dispatchEvent(new FocusEvent('focusout',{bubbles:true})));expect(input.value).toBe('32');
 });
});
describe('separator pointer interaction',()=>{
 it('ignores secondary clicks and drags with pointer capture, snapping near center',()=>{
  const main=host.querySelector('main')!;
  main.getBoundingClientRect=()=>({left:0,width:1000} as DOMRect);
  const separator=host.querySelector<HTMLElement>('[role=separator]')!;
  separator.setPointerCapture=vi.fn();separator.releasePointerCapture=vi.fn();
  const pointer=(type:string,clientX:number,button=0)=>{const event=new MouseEvent(type,{bubbles:true,cancelable:true,button,clientX});Object.defineProperty(event,'pointerId',{value:7});act(()=>separator.dispatchEvent(event));};
  pointer('pointerdown',500,2);pointer('pointermove',650);expect(separator.getAttribute('aria-valuenow')).toBe('50');
  pointer('pointerdown',500);pointer('pointermove',650);expect(separator.getAttribute('aria-valuenow')).toBe('65');expect(separator.setPointerCapture).toHaveBeenCalledWith(7);
  pointer('pointermove',509);expect(separator.getAttribute('aria-valuenow')).toBe('50');
  pointer('pointerup',509);expect(separator.releasePointerCapture).toHaveBeenCalledWith(7);
 });
});


describe('fixed shortcut preference migration', () => {
 it('removes the old above-line setting and allows saving after reserved mappings are cleaned up', () => {
  act(() => root.unmount());
  localStorage.setItem('texdraft.preferences.v1', JSON.stringify({ locale: 'en', keybindings: { insertBlankLineAbove: 'F8', selectAll: 'Mod-Shift-Enter', deleteLine: 'Mod-Enter' } }));
  root = createRoot(host);
  act(() => root.render(<App/>));
  key(',', primary());
  const labels = [...host.querySelectorAll('.shortcut-row')].map(row => row.textContent);
  expect(labels[0]).toContain('Undo');
  expect(labels.some(label => label?.includes('Insert blank line above'))).toBe(false);
  expect(labels.some(label => label?.includes('Insert formula separator'))).toBe(true);
  act(() => host.querySelector<HTMLButtonElement>('.dialog-actions .primary')!.click());
  expect(host.querySelector('[role=alert]')).toBeNull();
  expect(host.querySelector('dialog')?.open).toBe(false);
 });
});
