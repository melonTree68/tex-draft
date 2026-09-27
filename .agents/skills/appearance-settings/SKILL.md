---
name: appearance-settings
description: Maintain TeXDraft locale, theme, font preferences, and shortcut settings UI.
---

# Appearance and settings

`src/features/preferences/store.ts` validates stored preferences independently by field. On first launch, `navigator.language` selects Chinese for zh locales and English otherwise. `src/i18n.ts` owns visible shell strings; pass locale into the editor and translated labels into the renderer.

Light/dark/system updates `data-theme` on the document root. System mode listens to live matchMedia changes. Font choice is Latin Modern, TeX Gyre Pagella, or TeX Gyre Termes, passed to the compiler-backed preview.

Shortcut settings use the editor's command registry and shared `canonicalKeybinding` for syntax and platform-aware collision validation. Empty bindings disable commands; Tab and Shift-Tab remain reserved for snippet traversal. Settings use compact system-styled form rows without promotional descriptions. Shortcut fields show portable Mod notation with a platform explanation. Do not maintain a second key parser.

Run `npm test -- src/features/preferences/store.test.ts` and manually check locale, theme, reload persistence, and shortcut conflicts when changing the UI.

Preferences include code font size (14px, 8–32), preview font size (18px, 8–64), cursor blink (on), and active-line shading (4%, 0–30). Restore missing fields independently for old storage. Numeric inputs preserve transient text and clamp on blur/Enter so multi-digit typing works. Apply editor settings through compartments and preview size as display scale.

Mod-, opens settings via a capture listener and is reserved by the shared key parser. Each shortcut retains manual input plus explicit Record mode using `captureKeybinding`; consume recording events before editor/app shortcuts, ignore modifier-only events, and cancel with Escape. Capture reserved combinations visibly but reject them when applying. See `src/App.test.tsx` for interaction regression tests.
