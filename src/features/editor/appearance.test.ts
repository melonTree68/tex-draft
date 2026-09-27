// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it } from 'vitest';
import { EditorView } from '@codemirror/view';
import { undo } from '@codemirror/commands';
import { MathEditor } from './MathEditor';

it('reconfigures appearance while retaining view, selection, focus, and undo history', async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  const host = document.body.appendChild(document.createElement('div'));
  const root = createRoot(host);
  let value = 'x';
  const props = { value, onChange: (next: string) => { value = next; }, mode: 'math' as const, theme: 'light' as const, ariaLabel: 'Math' };
  try {
    await act(async () => root.render(createElement(MathEditor, props)));
    const view = EditorView.findFromDOM(host.querySelector('.cm-editor')!)!;
    view.focus();
    view.dispatch({ changes: { from: 1, insert: '+y' }, selection: { anchor: 2 } });
    await act(async () => root.render(createElement(MathEditor, { ...props, value, fontSize: 20, cursorBlink: false, activeLineHighlight: 0 })));
    expect(EditorView.findFromDOM(host.querySelector('.cm-editor')!)).toBe(view);
    expect(view.state.selection.main.head).toBe(2);
    expect(view.hasFocus).toBe(true);
    expect(getComputedStyle(view.dom).fontSize).toBe('20px');
    expect(host.querySelector('.cm-activeLine')).toBeNull();
    expect(host.querySelector('.cm-cursorLayer')?.getAttribute('style')).toContain('animation-duration: 0ms');
    expect(undo(view)).toBe(true);
    expect(view.state.doc.toString()).toBe('x');
    await act(async () => root.render(createElement(MathEditor, { ...props, value, theme: 'dark', cursorBlink: true, activeLineHighlight: 20 })));
    expect(host.querySelector('.cm-activeLine')).not.toBeNull();
    expect(getComputedStyle(host.querySelector('.cm-activeLine')!).backgroundColor).toBe('rgba(255, 255, 255, 0.2)');
    expect(host.querySelector('.cm-cursorLayer')?.getAttribute('style')).toContain('animation-duration: 1200ms');
  } finally {
    await act(async () => root.unmount());
    host.remove();
  }
});
