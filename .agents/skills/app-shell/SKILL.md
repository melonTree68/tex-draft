---
name: app-shell
description: Maintain TeXDraft desktop layout, React integration, and draft persistence.
---

# App shell

`src/App.tsx` composes independently owned editor and rendering components. `src/styles.css` controls an edge-to-edge two-pane desktop layout. Keep the macOS utility aesthetic minimal: neutral system colors/fonts, compact macro controls, one settings icon, functional separators. No in-content branding, pane title bars, badges, success footers, decorative cards, shadows, animations, or empty-state copy. Only errors and pending compilation need status text. Keep source and macros empty on first launch; the macro editor stays mounted when collapsed to preserve history. The renderer receives display-math contents without wrapper delimiters.

`src/features/preferences/store.ts` stores the draft separately from preferences, using versioned localStorage keys. Save source and macros synchronously after changes; a failed write must surface visibly without removing in-memory text. UI data never enters a remote service. App supports browser editing; native Tauri is required for actual TeX rendering.

Run `npm test`, `npm run build`; use `npm run dev` on port 1420 for UI checks. The Tauri application shares the same frontend. Do not commit unless requested.
