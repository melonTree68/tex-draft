---
name: math-editor
description: Maintain TeXDraft's CodeMirror editing, snippets, completion, and configurable keyboard commands in src/features/editor.
---

# Math editor

- `MathEditor` owns its CodeMirror view; React prop changes reconfigure compartments so history and focus survive. Keep it independent of rendering, persistence, and app controls. The body is display-math interior; definitions arrive through `macros` for completion.
- `commands.ts` is the app-visible bilingual command registry. Custom mappings replace defaults, including overlapping CodeMirror default/search/completion keymaps. Empty bindings disable a command. Registry defaults are platform-aware: macOS replace uses Mod-Alt-f and redo Mod-Shift-z; other platforms use Mod-h and Ctrl-y. `canonicalKeybinding` resolves aliases, modifier order, and platform `Mod` for validation and conflict detection. Tab and Shift-Tab are reserved for snippet traversal; Mod-, is reserved for app settings; Mod-Enter and Mod-Shift-Enter are fixed line insertion shortcuts. Preference loading drops obsolete command IDs and invalid/reserved mappings so old configuration cannot prevent settings saves. `captureKeybinding` records portable Mod notation, follows CodeMirror physical-key fallback for Ctrl/Meta chords, preserves Option characters, and ignores modifier-only/IME events.
- Appearance props `fontSize` (px, default 14), `cursorBlink` (default true), and `activeLineHighlight` (0–30 percent, default 4) reconfigure the existing view. Zero intensity removes line/gutter decorators; dark themes brighten the active line. Disable blinking through drawSelection cursorBlinkRate=0 and native caret-animation=manual.
- Configurable `insertFormulaSeparator` (Mod-Alt-Enter) inserts a standalone `%---` after the current line and moves to a blank formula line. Fixed Mod-Shift-Enter inserts above the current line, preserving its text and indentation; fixed Mod-Enter retains CodeMirror’s line-below behavior. Above-line insertion and the separator preserve selected text, use the selection head line, and work in macro mode as harmless comments/whitespace. Keep both fixed line shortcuts out of the settings registry and ahead of custom mappings. Registry order groups general editing, math authoring, search/selection, and line editing.
- `completion.ts` supplies numbered CodeMirror snippet fields and macro-name extraction. The begin snippet links opening and closing names. Tab accepts completion, traverses fields, then indents; Shift-Tab traverses back. Macro completion recognizes primitive definitions, command declarations, and math operators.
- `extensions.ts` closes known math environments only during actual typed input. Reuse an existing matching end; consume a brace already inserted by CodeMirror. Do not auto-expand document-level environments inside display math.
- `locale` translates completion descriptions and CodeMirror search phrases; `theme` follows the resolved app appearance and reconfigures both editor chrome and syntax HighlightStyle. TeX command tokens use tags.tagName as well as keyword; keep both legible in dark mode.

## Verification

Run `npm test -- src/features/editor` and `npm run typecheck`. Tests exercise actual CodeMirror selection movement, linked placeholders (with multiple selections enabled), typed environment insertion, duplicate prevention, macro extraction, remapping, captured shortcuts, separator/line insertion, and live appearance updates retaining selection, focus, and undo history.

## Common issues

Legacy `insertBlankLineAbove` preferences are removed by `sanitizeKeybindings`; fixed line chords are also rejected through aliases by canonical validation. Default keymaps can silently retain an old remapped shortcut. Filter owned commands from fallback keymaps. Place the environment input handler before automatic bracket handling so a typed closing brace is observed.

In jsdom appearance tests, mock `Range.getClientRects` and `Range.getBoundingClientRect`: CodeMirror measures text asynchronously on animation frames, so missing geometry APIs cause timing-dependent unhandled errors despite passing assertions.
