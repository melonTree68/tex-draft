import { useEffect, useRef, useState } from 'react';
import { MathEditor, EDITOR_COMMANDS, canonicalKeybinding, captureKeybinding } from './features/editor';
import { Preview } from './features/rendering';
import { loadDraft, loadPreferences, readJson, saveJson, STORAGE_KEYS } from './features/preferences/store';
import type { Preferences } from './features/preferences/store';
import { addPreset, parsePresets, renamePreset } from './features/presets/store';
import { messages } from './i18n';
import { clampSplit, draggedSplit, splitBounds, DEFAULT_MACRO_HEIGHT, clampMacroHeight, draggedMacroHeight, macroHeightBounds } from './features/layout/split';

function Icon({name}:{name:'settings'|'chevron'|'close'}) {
 return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{name==='settings'?<><path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3" fill="var(--panel)"/><circle cx="15" cy="17" r="3" fill="var(--panel)"/></>:name==='chevron'?<path d="m9 5 7 7-7 7"/>:<path d="m6 6 12 12M18 6 6 18"/>}</svg>;
}
function FontSizeInput({value,min,max,onChange}:{value:number;min:number;max:number;onChange:(value:number)=>void}) {
 const [text,setText]=useState(String(value));
 useEffect(()=>setText(String(value)),[value]);
 const commit=()=>{const parsed=Number(text);const next=text.trim()&&Number.isFinite(parsed)?Math.min(max,Math.max(min,parsed)):value;setText(String(next));onChange(next);};
 return <input type="number" min={min} max={max} value={text} onChange={event=>{const next=event.target.value;setText(next);const parsed=Number(next);if(next.trim()&&Number.isFinite(parsed)&&parsed>=min&&parsed<=max)onChange(parsed);}} onBlur={commit} onKeyDown={event=>{if(event.key==='Enter'){event.preventDefault();commit();}}}/>;
}
export default function App() {
 const [draft,setDraft] = useState(()=>loadDraft(localStorage));
 const [prefs,setPrefs] = useState(()=>loadPreferences(localStorage));
 const [presets,setPresets] = useState(()=>parsePresets(readJson(localStorage,STORAGE_KEYS.presets)));
 const [selected,setSelected] = useState('');
 const [expanded,setExpanded] = useState(true);
 const [saved,setSaved] = useState(true);
 const [darkSystem,setDarkSystem] = useState(()=>matchMedia('(prefers-color-scheme: dark)').matches);
 const [dialog,setDialog] = useState<'settings'|'save'|'rename'|'delete'|null>(null);
 const [name,setName] = useState(''); const [nameError,setNameError] = useState(false);
 const [bindingError,setBindingError] = useState('');
 const [bindingDraft,setBindingDraft] = useState<Record<string,string>>({});
 const [recording,setRecording] = useState<string|null>(null);
 const [workspaceWidth,setWorkspaceWidth] = useState(960);
 const [dragging,setDragging] = useState(false);
 const [macroAvailableHeight,setMacroAvailableHeight]=useState(600);
 const [macroDragging,setMacroDragging]=useState(false);
 const sourcePane=useRef<HTMLElement>(null);
 const macroToolbar=useRef<HTMLDivElement>(null);
 const macroDragPointer=useRef<number|null>(null);
 const workspace = useRef<HTMLElement>(null);
 const dragPointer = useRef<number|null>(null);
 const modal = useRef<HTMLDialogElement>(null);
 const t = messages[prefs.locale];
 const theme = prefs.theme === 'system' ? darkSystem ? 'dark':'light' : prefs.theme;
 useEffect(()=> { const media=matchMedia('(prefers-color-scheme: dark)'); const update=()=>setDarkSystem(media.matches); media.addEventListener('change',update); return ()=>media.removeEventListener('change',update); },[]);
 useEffect(()=> { document.documentElement.dataset.theme=theme; document.documentElement.lang=prefs.locale==='zh'?'zh-CN':'en'; },[theme,prefs.locale]);
 useEffect(()=> { setSaved(saveJson(localStorage,STORAGE_KEYS.draft,draft)); },[draft]);
 useEffect(()=> { if(!saveJson(localStorage,STORAGE_KEYS.preferences,prefs)) setSaved(false); },[prefs]);
 useEffect(()=> { if(!saveJson(localStorage,STORAGE_KEYS.presets,presets)) setSaved(false); },[presets]);
 useEffect(()=> { if(dialog) modal.current?.showModal(); else modal.current?.close(); },[dialog]);
 const pref = <K extends keyof Preferences>(key:K,value:Preferences[K])=>setPrefs(p=>({...p,[key]:value}));
 const open = (type:typeof dialog)=> { setName(type==='rename'?presets.find(p=>p.id===selected)?.name??'':''); setNameError(false); setBindingError(''); setBindingDraft(prefs.keybindings); setDialog(type); };
 useEffect(()=> {
  const element=workspace.current;
  if(!element) return;
  const update=()=>{setWorkspaceWidth(element.clientWidth);setMacroAvailableHeight(Math.max(0,(sourcePane.current?.clientHeight??0)-(macroToolbar.current?.offsetHeight??0)-1));};
  const observer=new ResizeObserver(update);
  update(); observer.observe(element); if(macroToolbar.current)observer.observe(macroToolbar.current); return ()=>observer.disconnect();
 },[]);
 useEffect(()=> {
  const onKey=(event:KeyboardEvent)=> {
   if(recording) {
    event.preventDefault(); event.stopImmediatePropagation();
    if(event.key==='Escape') {setRecording(null);return;}
    const key=captureKeybinding(event);
    if(key!==null) {setBindingDraft(current=>({...current,[recording]:key}));setRecording(null);setBindingError('');}
    return;
   }
   const mac=/Mac|iPhone|iPad/.test(navigator.platform);
   if((mac?event.metaKey:event.ctrlKey) && !event.altKey && !event.shiftKey && !(mac?event.ctrlKey:event.metaKey) && (event.key===','||event.code==='Comma')) {
    event.preventDefault(); event.stopImmediatePropagation();
    if(dialog!=='settings') open('settings');
   }
  };
  window.addEventListener('keydown',onKey,true);
  return ()=>window.removeEventListener('keydown',onKey,true);
 });
 useEffect(()=> {if(dialog!=='settings')setRecording(null);},[dialog]);
 const moveSplit=(clientX:number)=> {const rect=workspace.current?.getBoundingClientRect();if(rect)pref('paneRatio',draggedSplit(clientX-rect.left,rect.width));};
 const moveMacroSplit=(clientY:number)=>{const toolbar=macroToolbar.current?.getBoundingClientRect();if(toolbar)pref('macroHeight',draggedMacroHeight(clientY-toolbar.bottom,macroAvailableHeight));};
 const macroHeight=clampMacroHeight(prefs.macroHeight,macroAvailableHeight);
 const [minimumMacroHeight,maximumMacroHeight]=macroHeightBounds(macroAvailableHeight);
 const ratio=clampSplit(prefs.paneRatio,workspaceWidth);
 const [minimumRatio,maximumRatio]=splitBounds(workspaceWidth);
 const submitPreset = ()=> { try { if(dialog==='save') { const id=crypto.randomUUID(); setPresets(addPreset(presets,name,draft.macros,id)); setSelected(id); } else setPresets(renamePreset(presets,selected,name)); setDialog(null); } catch { setNameError(true); } };
 const applyBindings = ()=> { const normalized = EDITOR_COMMANDS.map(c=>({id:c.id,key:(bindingDraft[c.id]??c.defaultKey).trim()}));
  if(normalized.some(c=>c.key && canonicalKeybinding(c.key) === null)) { setBindingError(t.shortcutInvalid); return; }
  const keys=normalized.map(c=>canonicalKeybinding(c.key)).filter(Boolean);
  if(new Set(keys).size!==keys.length) { setBindingError(t.shortcutConflict); return; }
  pref('keybindings',Object.fromEntries(normalized.map(c=>[c.id,c.key]))); setDialog(null);
 };
 const currentPreset=presets.find(p=>p.id===selected);
 return <div className="app-shell">
  <main ref={workspace} className={`workspace ${dragging?'workspace--resizing':''} ${macroDragging?'workspace--resizing-rows':''}`} style={{gridTemplateColumns:`minmax(0, ${ratio}fr) 1px minmax(0, ${1-ratio}fr)`}}>
   <section ref={sourcePane} className="source-pane" aria-label={t.source}>
    <section className={`macro-section ${expanded?'expanded':''}`}>
     <div ref={macroToolbar} className="toolbar">
      <button className="macro-toggle" aria-expanded={expanded} aria-label={expanded?t.collapseMacros:t.expandMacros} onClick={()=>setExpanded(!expanded)}><Icon name="chevron"/>{t.macros}</button>
      <div className="preset-controls">
       {presets.length>0&&<select aria-label={t.presets} value={selected} onChange={e=>{const p=presets.find(p=>p.id===e.target.value);setSelected(e.target.value);if(p)setDraft(d=>({...d,macros:p.macros}));}}><option value="">{t.selectPreset}</option>{presets.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select>}
       <button onClick={()=>open('save')}>{t.savePreset}</button>
       {currentPreset&&<><button onClick={()=>open('rename')}>{t.rename}</button><button onClick={()=>open('delete')}>{t.delete}</button></>}
      </div>
     </div>
     <div hidden={!expanded} className="macro-editor" style={{height:macroHeight}}><MathEditor locale={prefs.locale} mode="macros" value={draft.macros} onChange={macros=>setDraft(d=>({...d,macros}))} theme={theme} keybindings={prefs.keybindings} fontSize={prefs.codeFontSize} cursorBlink={prefs.cursorBlink} activeLineHighlight={prefs.activeLineHighlight} ariaLabel={t.macrosLabel}/></div>
    </section>
    {expanded&&<div className="macro-separator" role="separator" tabIndex={0} aria-label={t.resizeMacros} aria-orientation="horizontal" aria-valuemin={Math.round(minimumMacroHeight)} aria-valuemax={Math.round(maximumMacroHeight)} aria-valuenow={Math.round(macroHeight)}
     onPointerDown={event=>{if(event.button!==0)return;event.preventDefault();macroDragPointer.current=event.pointerId;event.currentTarget.setPointerCapture(event.pointerId);setMacroDragging(true);}}
     onPointerMove={event=>{if(macroDragPointer.current===event.pointerId)moveMacroSplit(event.clientY);}}
     onPointerUp={event=>{if(macroDragPointer.current===event.pointerId){macroDragPointer.current=null;event.currentTarget.releasePointerCapture(event.pointerId);setMacroDragging(false);}}}
     onPointerCancel={()=>{macroDragPointer.current=null;setMacroDragging(false);}}
     onLostPointerCapture={()=>{macroDragPointer.current=null;setMacroDragging(false);}}
     onDoubleClick={()=>pref('macroHeight',DEFAULT_MACRO_HEIGHT)}
     onKeyDown={event=>{let next:number;if(event.key==='ArrowUp')next=macroHeight-10;else if(event.key==='ArrowDown')next=macroHeight+10;else if(event.key==='Home')next=minimumMacroHeight;else if(event.key==='End')next=maximumMacroHeight;else if(event.key==='Enter')next=DEFAULT_MACRO_HEIGHT;else return;event.preventDefault();pref('macroHeight',clampMacroHeight(next,macroAvailableHeight));}}/>}
    <div className="math-editor"><MathEditor locale={prefs.locale} mode="math" value={draft.source} onChange={source=>setDraft(d=>({...d,source}))} theme={theme} keybindings={prefs.keybindings} fontSize={prefs.codeFontSize} cursorBlink={prefs.cursorBlink} activeLineHighlight={prefs.activeLineHighlight} ariaLabel={t.editorLabel} macros={draft.macros}/></div>
   </section>
   <div className="pane-separator" role="separator" tabIndex={0} aria-label={t.resizePanes} aria-orientation="vertical" aria-valuemin={Math.round(minimumRatio*100)} aria-valuemax={Math.round(maximumRatio*100)} aria-valuenow={Math.round(ratio*100)}
    onPointerDown={event=>{if(event.button!==0)return;event.preventDefault();dragPointer.current=event.pointerId;event.currentTarget.setPointerCapture(event.pointerId);setDragging(true);}}
    onPointerMove={event=>{if(dragPointer.current===event.pointerId)moveSplit(event.clientX);}}
    onPointerUp={event=>{if(dragPointer.current===event.pointerId){dragPointer.current=null;event.currentTarget.releasePointerCapture(event.pointerId);setDragging(false);}}}
    onPointerCancel={()=>{dragPointer.current=null;setDragging(false);}}
    onLostPointerCapture={()=>{dragPointer.current=null;setDragging(false);}}
    onDoubleClick={()=>pref('paneRatio',0.5)}
    onKeyDown={event=>{let next:number;if(event.key==='ArrowLeft')next=ratio-0.02;else if(event.key==='ArrowRight')next=ratio+0.02;else if(event.key==='Home')next=minimumRatio;else if(event.key==='End')next=maximumRatio;else if(event.key==='Enter')next=0.5;else return;event.preventDefault();pref('paneRatio',clampSplit(next,workspaceWidth));}}/>
   <section className="preview-pane" aria-label={t.preview}>
    <div className="preview-content"><Preview source={draft.source} macros={draft.macros} font={prefs.font} fontSize={prefs.previewFontSize} theme={theme} labels={{compiling:t.compiling,error:t.error,desktopOnly:t.desktopOnly,firstCompile:t.firstCompile,page:prefs.locale==='zh'?'数学公式':'Mathematics'}}/></div>
    <button className="settings-button" onClick={()=>open('settings')} title={t.settings} aria-label={t.settings}><Icon name="settings"/></button>
   </section>
  </main>
  {!saved&&<p className="save-error error-text" role="alert">{t.saveError}</p>}
  <dialog ref={modal} onCancel={()=>setDialog(null)} onClick={e=>{if(e.target===modal.current)setDialog(null);}}><div><div className="dialog-heading"><h2>{dialog==='settings'?t.settings:dialog==='delete'?t.deleteQuestion:dialog==='rename'?t.rename:t.savePreset}</h2><button className="icon-button" aria-label={t.close} onClick={()=>setDialog(null)}><Icon name="close"/></button></div>
   {dialog==='settings'?<><div className="settings-grid"><label>{t.language}<select value={prefs.locale} onChange={e=>pref('locale',e.target.value as Preferences['locale'])}><option value="en">English</option><option value="zh">简体中文</option></select></label><label>{t.appearance}<select value={prefs.theme} onChange={e=>pref('theme',e.target.value as Preferences['theme'])}><option value="system">{t.system}</option><option value="light">{t.light}</option><option value="dark">{t.dark}</option></select></label><label>{t.font}<select value={prefs.font} onChange={e=>pref('font',e.target.value as Preferences['font'])}><option value="latin-modern">Latin Modern</option><option value="pagella">TeX Gyre Pagella</option><option value="termes">TeX Gyre Termes</option></select></label><label>{t.codeFontSize}<FontSizeInput min={8} max={32} value={prefs.codeFontSize} onChange={value=>pref('codeFontSize',value)}/></label><label>{t.previewFontSize}<FontSizeInput min={8} max={64} value={prefs.previewFontSize} onChange={value=>pref('previewFontSize',value)}/></label><label>{t.cursorBlink}<input type="checkbox" checked={prefs.cursorBlink} onChange={e=>pref('cursorBlink',e.target.checked)}/></label><label>{t.activeLineHighlight}<span className="range-setting"><input type="range" min={0} max={30} value={prefs.activeLineHighlight} onChange={e=>pref('activeLineHighlight',e.target.valueAsNumber)}/><output>{prefs.activeLineHighlight}%</output></span></label></div><div className="shortcuts-heading"><h3>{t.shortcuts}</h3><button className="text-button" onClick={()=>{setBindingDraft({});setBindingError('');setRecording(null);}}>{t.reset}</button></div><p className="shortcut-hint">{t.shortcutHint}</p><div className="shortcut-list">{EDITOR_COMMANDS.map(command=><label className="shortcut-row" key={command.id}><span>{prefs.locale==='zh'?command.labelZh:command.labelEn}</span><span className="shortcut-controls"><input aria-label={prefs.locale==='zh'?command.labelZh:command.labelEn} value={bindingDraft[command.id]??command.defaultKey} onChange={e=>setBindingDraft({...bindingDraft,[command.id]:e.target.value})} spellCheck={false}/><button type="button" className="record-button" aria-pressed={recording===command.id} onClick={()=>setRecording(recording===command.id?null:command.id)}>{recording===command.id?t.recording:t.record}</button></span></label>)}</div>{bindingError&&<p role="alert" className="error-text">{bindingError}</p>}<div className="dialog-actions"><button className="primary" onClick={applyBindings}>{t.done}</button></div></>:dialog==='delete'?<><p className="dialog-description">{t.deleteHint}</p><p>{currentPreset?.name}</p><div className="dialog-actions"><button onClick={()=>setDialog(null)}>{t.cancel}</button><button className="danger" onClick={()=>{setPresets(presets.filter(p=>p.id!==selected));setSelected('');setDialog(null);}}>{t.delete}</button></div></>:<form onSubmit={e=>{e.preventDefault();submitPreset();}}><label className="name-field">{t.presetName}<input autoFocus value={name} onChange={e=>setName(e.target.value)} maxLength={80}/></label>{nameError&&<p role="alert" className="error-text">{t.nameError}</p>}<div className="dialog-actions"><button type="button" onClick={()=>setDialog(null)}>{t.cancel}</button><button className="primary" type="submit">{t.save}</button></div></form>}
  </div></dialog>
 </div>;
}
