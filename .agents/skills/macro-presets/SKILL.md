---
name: macro-presets
description: Maintain user-created macro preset storage and selection in TeXDraft.
---

# Macro presets

`src/features/presets/store.ts` owns immutable preset operations and validates restored records. Presets consist of stable id, trimmed unique name, and verbatim macro source. The preset collection starts empty; do not add example presets.

The shell provides save-as, select/apply, rename, and delete actions. Saving captures current macro text; selecting replaces only current macros. Renaming and deleting retain current draft definitions. Edited definitions do not silently overwrite an existing preset; save-as captures a new named collection. All collections persist under `texdraft.presets.v1`.

Run `npm test -- src/features/presets/store.test.ts` after changing collection behavior. Keep TeX interpretation in the compiler and editor subsystems.
