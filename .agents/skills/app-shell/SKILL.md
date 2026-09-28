---
name: app-shell
description: Maintain TeXDraft desktop layout, React integration, and draft persistence.
---

# App shell

`src/App.tsx` composes independently owned editor and rendering components. `src/styles.css` controls an edge-to-edge two-pane desktop layout. Keep the macOS utility aesthetic minimal: neutral system colors/fonts, compact macro controls, one settings icon, functional separators. No in-content branding, pane title bars, badges, success footers, decorative cards, shadows, animations, or empty-state copy. Only errors and pending compilation need status text. Keep source and macros empty on first launch; the macro editor stays mounted when collapsed to preserve history. The renderer receives display-math contents without wrapper delimiters.

`src/features/preferences/store.ts` stores the draft separately from preferences, using versioned localStorage keys. Save source and macros synchronously after changes; a failed write must surface visibly without removing in-memory text. UI data never enters a remote service. App supports browser editing; native Tauri is required for actual TeX rendering.

Run `npm test`, `npm run build`; use `npm run dev` on port 1420 for UI checks. The Tauri application shares the same frontend. Do not commit unless requested.

The center separator uses primary pointer capture with a 9px hit area, preserves at least 240px per pane, and snaps within 12px of 50%. Store the requested ratio in preferences; clamp its displayed value after resize. Arrow keys adjust it, Home/End use bounds, Enter or double-click resets. Keep compact preset controls wrapping at narrow pane widths. Test split geometry and App pointer/keyboard interaction.

The macro/source horizontal separator replaces the native textarea-style resize grip. Persist requested `macroHeight` (default 112px); clamp displayed height to leave 48px for macros and 96px for source, accounting for toolbar wrapping via ResizeObserver. Primary pointer capture snaps within 12px of the default height; Up/Down adjust, Home/End use bounds, Enter/double-click resets. Collapse hides the separator and macro contents without unmounting the editor or changing the saved height.
