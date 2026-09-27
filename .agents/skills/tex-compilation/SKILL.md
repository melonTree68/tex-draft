---
name: tex-compilation
description: Maintain TeXDraft's native LaTeX compilation, PDF preview, math fonts, and desktop packaging. Use for compilation correctness, rendering concurrency, or native build changes.
---

# TeX compilation and preview

- Native entrypoint: `src-tauri/src/compiler.rs`; wrapper: `document.rs`. `compile_math` takes `{request:{source,macros,font}}` and returns `{pdfBase64}` or rejects with a TeX log. Inputs are one display-math body and a separate preamble for definitions.
- Tectonic is embedded; each invocation creates a fresh in-memory session rooted in a temporary directory, with shell escape disabled. Serialize sessions because the engines have global state. Package/font resources download on first use and remain in Tectonic's cache.
- The cropped standalone box uses `\displaystyle`; accept `aligned`, `gathered`, `cases`, matrices. Reject document/display wrappers with actionable feedback. Load amsmath, amssymb, mathtools before fonts, then bm and esint. Fonts: latin-modern = lmodern; pagella = newpxtext/newpxmath; termes = newtxtext/newtxmath. Classic math fonts retain bm/esint compatibility.
- `src/features/rendering/Preview.tsx` debounces 300ms. `scheduler.ts` permits one active plus one replaceable pending request. Effects ignore stale results. Keep the last successful PDF on TeX errors; render canvas offscreen before swapping; bundle the PDF.js legacy build and worker locally, loading the PDF component lazily after a successful compilation. Empty preview stays blank; compilation uses plain status text. Successful IPC responses contain only the PDF; keep logs for errors. PDF.js 6 disposes documents via the loading task; retain the old task until the replacement loads. Browser mode explains desktop compilation availability.
- Keep compilation independent of presets, editor state, localization, and theme storage. Preview receives all text and appearance through props.
- Checks: `npm test`, `cargo test --manifest-path src-tauri/Cargo.toml`. Real compiler smoke test downloads resources: `cargo test --manifest-path src-tauri/Cargo.toml -- --ignored`. It covers all fonts, macros/packages, recovery after invalid TeX, and session isolation. Wrapper-only tests can run with `rustc --test src-tauri/src/document.rs` when native prerequisites are missing.
- Native packaging uses Tauri 2 (`src-tauri/tauri.conf.json`); build on each target OS with its Tauri and Tectonic development dependencies. Never depend on a system TeX installation at runtime.

- Packaging targets macOS 13+, Windows with WebView2, and modern Linux WebKitGTK 4.1. `.github/workflows/desktop.yml` builds/tests all three systems; native runtime resources use the Tectonic cache. Icons are reproducible with `python3 src-tauri/icons/generate.py`.
- Native build issue: a missing `pkg-config` stops Tectonic bridge crates before application Rust can be checked. Install the official platform build prerequisites; wrapper-only XeLaTeX checks do not establish embedded-engine correctness.
