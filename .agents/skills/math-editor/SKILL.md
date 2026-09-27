---
name: math-editor
description: Maintain TeXDraft's CodeMirror editing, snippets, completion, and configurable keyboard commands in src/features/editor.
---

# Math editor

- `MathEditor` owns its CodeMirror view; React prop changes reconfigure compartments so history and focus survive. Keep it independent of rendering, persistence, and app controls. The body is display-math interior; definitions arrive through `macros` for completion.
- `commands.ts` is the app-visible bilingual command registry. Custom mappings replace defaults, including overlapping CodeMirror default/search/completion keymaps. Empty bindings disable a command. Registry defaults are platform-aware: macOS replace uses Mod-Alt-f and redo Mod-Shift-z; other platforms use Mod-h and Ctrl-y. `canonicalKeybinding` resolves aliases, modifier order, and platform `Mod` for validation and conflict detection. Tab and Shift-Tab are reserved for snippet traversal.
- `completion.ts` supplies numbered CodeMirror snippet fields and macro-name extraction. The begin snippet links opening and closing names. Tab accepts completion, traverses fields, then indents; Shift-Tab traverses back. Macro completion recognizes primitive definitions, command declarations, and math operators.
- `extensions.ts` closes known math environments only during actual typed input. Reuse an existing matching end; consume a brace already inserted by CodeMirror. Do not auto-expand document-level environments inside display math.
- `locale` translates completion descriptions and CodeMirror search phrases; `theme` follows the resolved app appearance and reconfigures both editor chrome and syntax HighlightStyle. TeX command tokens use tags.tagName as well as keyword; keep both legible in dark mode.

## Verification

Run `npm test -- src/features/editor/editor.test.ts` and `npm run typecheck`. Tests exercise actual CodeMirror selection movement, linked placeholders (with multiple selections enabled), typed environment insertion, duplicate prevention, macro extraction, and remapping.

## Common issues

Default keymaps can silently retain an old remapped shortcut. Filter owned commands from fallback keymaps. Place the environment input handler before automatic bracket handling so a typed closing brace is observed.
