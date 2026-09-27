---
name: appearance-settings
description: Maintain TeXDraft locale, theme, font preferences, and shortcut settings UI.
---

# Appearance and settings

`src/features/preferences/store.ts` validates stored preferences independently by field. On first launch, `navigator.language` selects Chinese for zh locales and English otherwise. `src/i18n.ts` owns visible shell strings; pass locale into the editor and translated labels into the renderer.

Light/dark/system updates `data-theme` on the document root. System mode listens to live matchMedia changes. Font choice is Latin Modern, TeX Gyre Pagella, or TeX Gyre Termes, passed to the compiler-backed preview.

Shortcut settings use the editor's command registry and shared `canonicalKeybinding` for syntax and platform-aware collision validation. Empty bindings disable commands; Tab and Shift-Tab remain reserved for snippet traversal. Settings use compact system-styled form rows without promotional descriptions. Shortcut fields show portable Mod notation with a platform explanation. Do not maintain a second key parser.

Run `npm test -- src/features/preferences/store.test.ts` and manually check locale, theme, reload persistence, and shortcut conflicts when changing the UI.
